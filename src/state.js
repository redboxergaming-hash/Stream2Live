import { APP_CONFIG } from './config.js';
import { loadSettings, saveSettings } from './utils/storage.js';

export function createStore(initialSupport) {
  const persisted = loadSettings();
  const state = {
    support: initialSupport,
    engineState: 'idle',
    captureStatus: 'inactive',
    playbackStatus: 'stopped',
    permissionStatus: 'idle',
    selectedDelaySeconds: persisted.lastUsedDelay ?? APP_CONFIG.defaultDelaySeconds,
    customDelaySeconds: persisted.lastCustomDelay ?? APP_CONFIG.defaultCustomDelaySeconds,
    targetDelaySeconds: persisted.lastUsedDelay ?? APP_CONFIG.defaultDelaySeconds,
    activeDelaySeconds: 0,
    bufferedSeconds: 0,
    bufferingProgress: 0,
    volume: persisted.lastVolume ?? APP_CONFIG.defaultVolume,
    muted: persisted.muted ?? false,
    captureStreamActive: false,
    hasAudioTrack: false,
    audioTrackCount: 0,
    captureSampleRate: 0,
    captureChannelCount: 0,
    sourceAudioFlowing: false,
    meterLevel: 0,
    autoStartWhenReady: true,
    diagnosticsOpen: false,
    statusMessage: 'Ready to capture.',
    warningMessage: initialSupport.notes[0] ?? '',
    errorMessage: '',
    strategy: 'AudioWorklet input capture + ring buffer + scheduled Web Audio playback',
    diagnostics: {
      logs: [],
      rawError: '',
    },
  };

  const listeners = new Set();

  function notify() {
    const settings = {
      lastUsedDelay: state.targetDelaySeconds,
      lastCustomDelay: state.customDelaySeconds,
      lastVolume: state.volume,
      muted: state.muted,
    };
    saveSettings(settings);
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    setState(updater) {
      updater(state);
      notify();
    },
  };
}
