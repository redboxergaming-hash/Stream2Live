import { loadCaptureWorklet } from './workletLoader.js';

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

export class CaptureManager {
  constructor({ onChunk, onEnded, onTrackInfo }) {
    this.onChunk = onChunk;
    this.onEnded = onEnded;
    this.onTrackInfo = onTrackInfo;
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.fallbackProcessor = null;
    this.silentGain = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioTracks = this.stream.getAudioTracks();
    this.onTrackInfo({
      audioTrackCount: audioTracks.length,
      hasAudioTrack: audioTracks.length > 0,
      trackLabel: audioTracks[0]?.label ?? '',
    });

    if (!audioTracks.length) {
      throw new Error('The selected source did not expose an audio track. Choose a browser tab/window and enable audio sharing.');
    }

    audioTracks.forEach((track) => {
      track.addEventListener('ended', () => this.onEnded?.());
    });

    this.audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
    await this.audioContext.resume();

    const settings = audioTracks[0].getSettings?.() ?? {};
    this.onTrackInfo({
      audioTrackCount: audioTracks.length,
      hasAudioTrack: true,
      sampleRate: settings.sampleRate ?? this.audioContext.sampleRate,
      channelCount: settings.channelCount ?? 2,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.silentGain = this.audioContext.createGain();
    this.silentGain.gain.value = 0;
    this.silentGain.connect(this.audioContext.destination);

    if (this.audioContext.audioWorklet) {
      await loadCaptureWorklet(this.audioContext);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'capture-processor');
      this.workletNode.port.onmessage = (event) => this.onChunk(event.data.channels);
      this.sourceNode.connect(this.workletNode).connect(this.silentGain);
      return { strategy: 'audio-worklet' };
    }

    const processor = this.audioContext.createScriptProcessor(2048, 2, 2);
    processor.onaudioprocess = (event) => {
      const { inputBuffer } = event;
      const channels = Array.from({ length: inputBuffer.numberOfChannels }, (_, index) =>
        new Float32Array(inputBuffer.getChannelData(index)),
      );
      this.onChunk(channels);
    };
    this.fallbackProcessor = processor;
    this.sourceNode.connect(processor).connect(this.silentGain);
    return { strategy: 'script-processor-fallback' };
  }

  async stop() {
    this.workletNode?.disconnect();
    this.fallbackProcessor?.disconnect();
    this.sourceNode?.disconnect();
    this.silentGain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.fallbackProcessor = null;
    this.silentGain = null;
  }
}
