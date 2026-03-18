import { APP_CONFIG } from '../config.js';
import { RollingAudioBuffer } from './ringBuffer.js';
import { computeMeterLevel } from './meter.js';

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

export class DelayEngine {
  constructor({ logger, onState }) {
    this.logger = logger;
    this.onState = onState;
    this.outputContext = null;
    this.gainNode = null;
    this.ringBuffer = null;
    this.schedulerTimer = null;
    this.nextPlaybackTime = 0;
    this.channelCount = 2;
    this.sampleRate = 48000;
    this.targetDelaySeconds = APP_CONFIG.defaultDelaySeconds;
    this.playing = false;
    this.captureActive = false;
    this.strategy = 'pending';
    this.meterLevel = 0;
  }

  configure({ delaySeconds, volume, muted }) {
    this.targetDelaySeconds = delaySeconds;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : volume;
    }
  }

  async ensureOutputContext() {
    if (!this.outputContext) {
      this.outputContext = new AudioContextCtor({ latencyHint: 'playback' });
      this.gainNode = this.outputContext.createGain();
      this.gainNode.connect(this.outputContext.destination);
    }
    if (this.outputContext.state !== 'running') {
      await this.outputContext.resume();
    }
  }

  startCapture({ sampleRate, channelCount, delaySeconds, volume, muted }) {
    this.sampleRate = sampleRate;
    this.channelCount = channelCount || 2;
    this.targetDelaySeconds = delaySeconds;
    const capacitySeconds = delaySeconds + APP_CONFIG.ringBufferHeadroomSeconds + APP_CONFIG.scheduleLookAheadSeconds;
    this.ringBuffer = new RollingAudioBuffer({
      sampleRate: this.sampleRate,
      channels: this.channelCount,
      capacitySeconds,
    });
    this.captureActive = true;
    this.playing = false;
    this.nextPlaybackTime = 0;
    this.strategy = 'ring-buffer-scheduled-playback';
    this.ensureOutputContext().then(() => {
      this.gainNode.gain.value = muted ? 0 : volume;
      this.pushState();
    });
    this.pushState();
  }

  ingest(channels) {
    if (!this.captureActive || !this.ringBuffer) return;
    this.ringBuffer.write(channels);
    this.meterLevel = computeMeterLevel(channels, this.meterLevel);
    this.pushState();
  }

  canPlay() {
    return this.captureActive && !!this.ringBuffer && this.ringBuffer.getBufferedSeconds() >= this.targetDelaySeconds;
  }

  async startPlayback() {
    if (!this.canPlay()) {
      throw new Error('Not enough audio buffered yet to start delayed playback.');
    }
    await this.ensureOutputContext();
    this.playing = true;
    this.nextPlaybackTime = this.outputContext.currentTime + 0.05;
    this.schedulerTimer = window.setInterval(() => this.schedulePlayback(), APP_CONFIG.schedulerTickMs);
    this.schedulePlayback();
    this.pushState();
  }

  schedulePlayback() {
    if (!this.playing || !this.outputContext || !this.ringBuffer) return;
    const chunkFrames = Math.ceil(APP_CONFIG.scheduleChunkSeconds * this.sampleRate);

    while (this.nextPlaybackTime < this.outputContext.currentTime + APP_CONFIG.scheduleLookAheadSeconds) {
      const channels = this.ringBuffer.read(chunkFrames);
      const buffer = this.outputContext.createBuffer(this.channelCount, chunkFrames, this.sampleRate);
      for (let channel = 0; channel < this.channelCount; channel += 1) {
        buffer.copyToChannel(channels[channel], channel);
      }
      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);
      source.start(this.nextPlaybackTime);
      this.nextPlaybackTime += buffer.duration;
    }

    this.pushState();
  }

  async stopPlayback() {
    this.playing = false;
    if (this.schedulerTimer) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.nextPlaybackTime = 0;
    this.pushState();
  }

  async stopCapture() {
    await this.stopPlayback();
    this.captureActive = false;
    this.ringBuffer?.reset();
    this.ringBuffer = null;
    this.meterLevel = 0;
    this.pushState();
  }

  async reset() {
    await this.stopCapture();
    if (this.outputContext && this.outputContext.state !== 'closed') {
      await this.outputContext.close();
    }
    this.outputContext = null;
    this.gainNode = null;
    this.pushState();
  }

  pushState() {
    const bufferedSeconds = this.ringBuffer?.getBufferedSeconds() ?? 0;
    this.onState({
      bufferedSeconds,
      bufferingProgress: this.targetDelaySeconds ? Math.min(1, bufferedSeconds / this.targetDelaySeconds) : 0,
      activeDelaySeconds: this.playing ? bufferedSeconds : 0,
      playbackStatus: this.playing ? 'playing-delayed' : 'stopped',
      captureStatus: this.captureActive ? 'capturing' : 'inactive',
      engineState: this.captureActive
        ? this.playing
          ? 'playing-delayed'
          : bufferedSeconds >= this.targetDelaySeconds
            ? 'ready'
            : 'buffering'
        : 'idle',
      meterLevel: this.meterLevel,
      outputContextState: this.outputContext?.state ?? 'closed',
      strategy: this.strategy,
      sourceAudioFlowing: this.meterLevel > 0.01,
    });
  }
}
