export class RollingAudioBuffer {
  constructor({ sampleRate, channels, capacitySeconds }) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.capacityFrames = Math.max(1, Math.ceil(sampleRate * capacitySeconds));
    this.buffers = Array.from({ length: channels }, () => new Float32Array(this.capacityFrames));
    this.writeFrame = 0;
    this.totalFramesWritten = 0;
    this.totalFramesTrimmed = 0;
    this.totalFramesRead = 0;
  }

  write(channelData) {
    const frames = channelData[0]?.length ?? 0;
    if (!frames) return;

    for (let i = 0; i < frames; i += 1) {
      for (let channel = 0; channel < this.channels; channel += 1) {
        const source = channelData[Math.min(channel, channelData.length - 1)];
        this.buffers[channel][this.writeFrame] = source?.[i] ?? 0;
      }
      this.writeFrame = (this.writeFrame + 1) % this.capacityFrames;
      this.totalFramesWritten += 1;
      const unreadFrames = this.totalFramesWritten - this.totalFramesTrimmed - this.totalFramesRead;
      if (unreadFrames > this.capacityFrames) {
        this.totalFramesTrimmed += unreadFrames - this.capacityFrames;
      }
    }
  }

  getBufferedFrames() {
    return Math.max(0, this.totalFramesWritten - this.totalFramesTrimmed - this.totalFramesRead);
  }

  getBufferedSeconds() {
    return this.getBufferedFrames() / this.sampleRate;
  }

  read(frames) {
    const available = this.getBufferedFrames();
    const toRead = Math.min(frames, available);
    const output = Array.from({ length: this.channels }, () => new Float32Array(frames));
    if (!toRead) return output;

    const startAbsolute = this.totalFramesTrimmed + this.totalFramesRead;
    for (let i = 0; i < toRead; i += 1) {
      const absoluteFrame = startAbsolute + i;
      const bufferIndex = absoluteFrame % this.capacityFrames;
      for (let channel = 0; channel < this.channels; channel += 1) {
        output[channel][i] = this.buffers[channel][bufferIndex];
      }
    }

    this.totalFramesRead += toRead;
    return output;
  }

  reset() {
    this.buffers.forEach((buffer) => buffer.fill(0));
    this.writeFrame = 0;
    this.totalFramesWritten = 0;
    this.totalFramesTrimmed = 0;
    this.totalFramesRead = 0;
  }
}
