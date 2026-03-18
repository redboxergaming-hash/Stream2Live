import { APP_CONFIG } from '../config.js';
import { loadDelayProcessor } from './audioWorkletBridge.js';

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

export class DelayEngine {
  constructor({ onTelemetry, onNeedsResync }) {
    this.onTelemetry = onTelemetry;
    this.onNeedsResync = onNeedsResync;
    this.audioContext = null;
    this.workletNode = null;
    this.gainNode = null;
    this.started = false;
    this.currentTargetDelay = APP_CONFIG.defaultBaseDelaySeconds;
    this.baseDelaySeconds = APP_CONFIG.defaultBaseDelaySeconds;
  }

  async init({ sampleRate, channelCount, baseDelaySeconds, volume, muted }) {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.reset();
    }

    this.audioContext = new AudioContextCtor({ latencyHint: 'playback', sampleRate });
    await loadDelayProcessor(this.audioContext);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'delay-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [channelCount || 2],
      processorOptions: {
        channelCount: channelCount || 2,
        maxBufferSeconds: APP_CONFIG.maxBufferSeconds,
        baseDelaySeconds,
        maxCorrectionRateDelta: APP_CONFIG.maxCorrectionRateDelta,
        correctionRatePerSecondError: APP_CONFIG.correctionRatePerSecondError,
        targetToleranceSeconds: APP_CONFIG.targetToleranceSeconds,
      },
    });

    this.workletNode.port.onmessage = (event) => {
      if (event.data?.type === 'stats') {
        this.onTelemetry?.(event.data);
        if (Math.abs(event.data.syncErrorSeconds) > APP_CONFIG.largeAdjustmentThresholdSeconds * 1.5) {
          this.onNeedsResync?.();
        }
      }
    };

    this.gainNode = this.audioContext.createGain();
    this.workletNode.connect(this.gainNode).connect(this.audioContext.destination);
    this.setVolume({ volume, muted });
    this.setBaseDelay(baseDelaySeconds);
    await this.audioContext.resume();
    this.started = true;
  }

  appendChunk(channels) {
    this.workletNode?.port.postMessage({ type: 'append', channels });
  }

  async startPlayback() {
    if (!this.audioContext) throw new Error('Playback engine is not initialized yet.');
    await this.audioContext.resume();
    this.workletNode.port.postMessage({ type: 'set-playback', enabled: true });
  }

  stopPlayback() {
    this.workletNode?.port.postMessage({ type: 'set-playback', enabled: false });
  }

  setVolume({ volume, muted }) {
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : volume;
    }
  }

  setBaseDelay(baseDelaySeconds) {
    this.baseDelaySeconds = baseDelaySeconds;
    this.currentTargetDelay = baseDelaySeconds;
    this.workletNode?.port.postMessage({ type: 'set-base-delay', seconds: baseDelaySeconds });
    this.workletNode?.port.postMessage({ type: 'set-target-delay', seconds: baseDelaySeconds, strategy: 'nudge' });
  }

  setTargetDelay(targetDelaySeconds, strategy = 'nudge') {
    this.currentTargetDelay = targetDelaySeconds;
    this.workletNode?.port.postMessage({ type: 'set-target-delay', seconds: targetDelaySeconds, strategy });
  }

  async reset() {
    this.stopPlayback();
    this.workletNode?.port.postMessage({ type: 'reset' });
    this.workletNode?.disconnect();
    this.gainNode?.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.workletNode = null;
    this.gainNode = null;
    this.started = false;
  }
}
