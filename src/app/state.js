import { APP_CONFIG } from '../config.js';
import { loadSettings, saveSettings } from '../utils/storage.js';

export function createStore(support) {
  const persisted = loadSettings();
  const state = {
    support,
    baseDelaySeconds: persisted.baseDelaySeconds ?? APP_CONFIG.defaultBaseDelaySeconds,
    targetDelaySeconds: persisted.baseDelaySeconds ?? APP_CONFIG.defaultBaseDelaySeconds,
    effectiveDelaySeconds: 0,
    syncOffsetSeconds: persisted.syncOffsetSeconds ?? 0,
    bufferedSeconds: 0,
    bufferHealth: 0,
    readHeadSeconds: 0,
    writeHeadSeconds: 0,
    syncErrorSeconds: 0,
    syncMode: 'steady',
    syncCorrectionRate: 1,
    syncNudgePending: false,
    lastNudgeDirection: 'none',
    lastNudgeAmount: 0,
    resyncRecommended: false,
    volume: persisted.volume ?? APP_CONFIG.defaultVolume,
    muted: persisted.muted ?? false,
    uiTheme: 'dark',
    statusSeverity: support.notes.length ? 'warning' : 'success',
    statusTitle: 'Ready to connect',
    statusMessage: 'Open your live stream in another tab, start it there, then capture it here.',
    captureState: 'idle',
    playbackState: 'stopped',
    permissionState: 'idle',
    streamConnected: false,
    hasAudioTrack: false,
    audioTrackCount: 0,
    sampleRate: 0,
    channelCount: 0,
    meterLevel: 0,
    autoStart: true,
    diagnosticsOpen: false,
    strategy: 'AudioWorklet capture + AudioWorklet delayed playback',
    currentError: '',
    warningMessage: support.notes[0] ?? '',
    diagnostics: {
      logs: [],
      rawError: '',
      lastProcessorSnapshot: null,
    },
  };

  const listeners = new Set();
  const notify = () => {
    saveSettings({
      baseDelaySeconds: state.baseDelaySeconds,
      syncOffsetSeconds: state.syncOffsetSeconds,
      volume: state.volume,
      muted: state.muted,
    });
    listeners.forEach((listener) => listener(state));
  };

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
