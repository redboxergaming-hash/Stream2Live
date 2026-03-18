import { loadCaptureProcessor } from './audioWorkletBridge.js';

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

export class CaptureManager {
  constructor({ onChunk, onEnded, onTrackInfo }) {
    this.onChunk = onChunk;
    this.onEnded = onEnded;
    this.onTrackInfo = onTrackInfo;
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.captureNode = null;
    this.silentGain = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const audioTracks = this.stream.getAudioTracks();
    this.onTrackInfo({
      active: true,
      audioTrackCount: audioTracks.length,
      hasAudioTrack: audioTracks.length > 0,
    });

    if (!audioTracks.length) {
      throw new Error('No audio was detected from the selected tab. Re-open capture and make sure tab audio sharing is enabled.');
    }

    audioTracks.forEach((track) => track.addEventListener('ended', () => this.onEnded?.()));

    this.audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
    await this.audioContext.resume();
    await loadCaptureProcessor(this.audioContext);

    const settings = audioTracks[0].getSettings?.() ?? {};
    this.onTrackInfo({
      active: true,
      audioTrackCount: audioTracks.length,
      hasAudioTrack: true,
      sampleRate: settings.sampleRate ?? this.audioContext.sampleRate,
      channelCount: settings.channelCount ?? 2,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.captureNode = new AudioWorkletNode(this.audioContext, 'capture-processor');
    this.captureNode.port.onmessage = (event) => {
      if (event.data?.type === 'chunk') {
        this.onChunk(event.data.channels, event.data.peak);
      }
    };
    this.silentGain = this.audioContext.createGain();
    this.silentGain.gain.value = 0;
    this.silentGain.connect(this.audioContext.destination);
    this.sourceNode.connect(this.captureNode).connect(this.silentGain);
  }

  async stop() {
    this.captureNode?.disconnect();
    this.sourceNode?.disconnect();
    this.silentGain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.captureNode = null;
    this.silentGain = null;
  }
}
