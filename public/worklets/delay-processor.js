class DelayProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const config = options.processorOptions ?? {};
    this.channelCount = config.channelCount ?? 2;
    this.capacityFrames = Math.max(1, Math.floor((config.maxBufferSeconds ?? 150) * sampleRate));
    this.buffers = Array.from({ length: this.channelCount }, () => new Float32Array(this.capacityFrames));
    this.totalFramesWritten = 0;
    this.readHead = 0;
    this.playbackEnabled = false;
    this.targetDelayFrames = Math.floor((config.baseDelaySeconds ?? 10) * sampleRate);
    this.baseDelayFrames = this.targetDelayFrames;
    this.maxCorrectionRateDelta = config.maxCorrectionRateDelta ?? 0.04;
    this.correctionRatePerSecondError = config.correctionRatePerSecondError ?? 0.035;
    this.targetToleranceFrames = Math.floor((config.targetToleranceSeconds ?? 0.03) * sampleRate);
    this.initializedReadHead = false;
    this.syncMode = 'buffering';
    this.correctionRate = 1;
    this.statsCounter = 0;
    this.resyncFramesRemaining = 0;
    this.fadeFrames = 128;

    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(message) {
    if (message.type === 'append') {
      this.append(message.channels);
    } else if (message.type === 'set-playback') {
      this.playbackEnabled = message.enabled;
      if (this.playbackEnabled && !this.initializedReadHead) {
        this.alignReadHeadToTarget();
      }
    } else if (message.type === 'set-target-delay') {
      this.targetDelayFrames = Math.max(0, Math.floor(message.seconds * sampleRate));
      if (message.strategy === 'resync') {
        this.syncMode = 'controlled-resync';
        this.resyncFramesRemaining = this.fadeFrames * 2;
      }
    } else if (message.type === 'set-base-delay') {
      this.baseDelayFrames = Math.max(0, Math.floor(message.seconds * sampleRate));
    } else if (message.type === 'reset') {
      this.totalFramesWritten = 0;
      this.readHead = 0;
      this.initializedReadHead = false;
      this.playbackEnabled = false;
      this.syncMode = 'buffering';
      this.resyncFramesRemaining = 0;
      this.buffers.forEach((buffer) => buffer.fill(0));
    }
  }

  append(channels) {
    const frames = channels[0]?.length ?? 0;
    if (!frames) return;
    for (let i = 0; i < frames; i += 1) {
      const index = this.totalFramesWritten % this.capacityFrames;
      for (let channel = 0; channel < this.channelCount; channel += 1) {
        const source = channels[Math.min(channel, channels.length - 1)] ?? channels[0];
        this.buffers[channel][index] = source?.[i] ?? 0;
      }
      this.totalFramesWritten += 1;
    }
  }

  getOldestAvailableFrame() {
    return Math.max(0, this.totalFramesWritten - this.capacityFrames);
  }

  alignReadHeadToTarget() {
    const desired = this.totalFramesWritten - this.targetDelayFrames;
    this.readHead = Math.max(this.getOldestAvailableFrame(), desired);
    this.initializedReadHead = true;
  }

  getEffectiveDelayFrames() {
    return Math.max(0, this.totalFramesWritten - this.readHead);
  }

  getBufferedFrames() {
    return Math.max(0, this.totalFramesWritten - this.getOldestAvailableFrame());
  }

  sampleAt(channel, framePosition) {
    const floorFrame = Math.floor(framePosition);
    const frac = framePosition - floorFrame;
    const aIndex = floorFrame % this.capacityFrames;
    const bIndex = (floorFrame + 1) % this.capacityFrames;
    const buffer = this.buffers[channel];
    const a = buffer[aIndex] ?? 0;
    const b = buffer[bIndex] ?? 0;
    return a + (b - a) * frac;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    const oldest = this.getOldestAvailableFrame();
    if (this.readHead < oldest) {
      this.readHead = oldest;
      this.syncMode = 'controlled-resync';
    }

    const effectiveDelayFrames = this.getEffectiveDelayFrames();
    const syncErrorFrames = this.targetDelayFrames - effectiveDelayFrames;

    if (!this.initializedReadHead && this.totalFramesWritten >= this.targetDelayFrames) {
      this.alignReadHeadToTarget();
    }

    const enoughBuffered = this.totalFramesWritten - this.readHead > 512 && this.totalFramesWritten >= this.targetDelayFrames;
    if (!this.playbackEnabled || !this.initializedReadHead || !enoughBuffered) {
      output.forEach((channel) => channel.fill(0));
      this.syncMode = 'buffering';
      this.correctionRate = 1;
      this.maybePostStats(syncErrorFrames);
      return true;
    }

    if (this.resyncFramesRemaining > 0) {
      if (this.resyncFramesRemaining === this.fadeFrames * 2) {
        this.alignReadHeadToTarget();
      }
      this.resyncFramesRemaining -= frames;
      this.syncMode = 'controlled-resync';
    } else if (Math.abs(syncErrorFrames) <= this.targetToleranceFrames) {
      this.syncMode = 'steady';
    } else {
      this.syncMode = syncErrorFrames > 0 ? 'nudging-backward' : 'nudging-forward';
    }

    const errorSeconds = syncErrorFrames / sampleRate;
    const rateDelta = Math.max(
      -this.maxCorrectionRateDelta,
      Math.min(this.maxCorrectionRateDelta, errorSeconds * this.correctionRatePerSecondError),
    );
    this.correctionRate = this.resyncFramesRemaining > 0 ? 1 : 1 - rateDelta;

    for (let i = 0; i < frames; i += 1) {
      const availableAhead = this.totalFramesWritten - this.readHead;
      const canRead = availableAhead > 2;
      let gain = 1;
      if (this.resyncFramesRemaining > this.fadeFrames) {
        gain = Math.max(0, (this.resyncFramesRemaining - this.fadeFrames) / this.fadeFrames);
      } else if (this.resyncFramesRemaining > 0) {
        gain = Math.min(1, 1 - this.resyncFramesRemaining / this.fadeFrames);
      }

      for (let channel = 0; channel < output.length; channel += 1) {
        output[channel][i] = canRead ? this.sampleAt(channel, this.readHead) * gain : 0;
      }

      if (canRead) {
        this.readHead += this.correctionRate;
      }
    }

    this.maybePostStats(syncErrorFrames);
    return true;
  }

  maybePostStats(syncErrorFrames) {
    this.statsCounter += 1;
    if (this.statsCounter % 12 !== 0) return;
    this.port.postMessage({
      type: 'stats',
      bufferedSeconds: this.getBufferedFrames() / sampleRate,
      effectiveDelaySeconds: this.getEffectiveDelayFrames() / sampleRate,
      targetDelaySeconds: this.targetDelayFrames / sampleRate,
      syncErrorSeconds: syncErrorFrames / sampleRate,
      readHeadSeconds: this.readHead / sampleRate,
      writeHeadSeconds: this.totalFramesWritten / sampleRate,
      syncMode: this.syncMode,
      correctionRate: this.correctionRate,
    });
  }
}

registerProcessor('delay-processor', DelayProcessor);
