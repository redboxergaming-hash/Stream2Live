import { APP_CONFIG } from './config.js';
import { createStore } from './state.js';
import { runSupportChecks } from './diagnostics/supportChecks.js';
import { createLogger } from './diagnostics/logger.js';
import { formatError } from './diagnostics/errorFormatter.js';
import { CaptureManager } from './audio/captureManager.js';
import { DelayEngine } from './audio/delayEngine.js';
import { renderAppShell } from './ui/render.js';
import { renderCaptureControls, renderDelayControls, renderPlaybackControls } from './ui/controls.js';
import { renderStatus } from './ui/statusView.js';
import { renderDiagnostics } from './ui/diagnosticsView.js';

export function createApp(root) {
  const store = createStore(runSupportChecks());
  const logger = createLogger(store.setState);
  const view = renderAppShell(root);

  const delayEngine = new DelayEngine({
    logger,
    onState(partial) {
      store.setState((state) => {
        Object.assign(state, partial);
      });
    },
  });

  const captureManager = new CaptureManager({
    onChunk(channels) {
      delayEngine.ingest(channels);
      const state = store.getState();
      if (state.autoStartWhenReady && state.playbackStatus !== 'playing-delayed' && delayEngine.canPlay()) {
        startPlayback().catch((error) => handleError('Auto-start playback failed.', error));
      }
    },
    onEnded() {
      logger.warn('Capture ended by the browser or user.');
      handleCaptureEnded();
    },
    onTrackInfo(info) {
      store.setState((state) => {
        state.audioTrackCount = info.audioTrackCount ?? state.audioTrackCount;
        state.hasAudioTrack = info.hasAudioTrack ?? state.hasAudioTrack;
        state.captureSampleRate = info.sampleRate ?? state.captureSampleRate;
        state.captureChannelCount = info.channelCount ?? state.captureChannelCount;
        state.captureStreamActive = true;
      });
    },
  });

  const actions = {
    async startCapture() {
      const state = store.getState();
      if (!state.support.hasGetDisplayMedia) {
        store.setState((draft) => {
          draft.errorMessage = 'This browser does not support display/tab capture.';
          draft.statusMessage = 'Capture unsupported in this browser.';
        });
        return;
      }

      await stopPlayback();
      await stopCapture();

      store.setState((draft) => {
        draft.permissionStatus = 'requesting';
        draft.statusMessage = 'Waiting for browser permission…';
        draft.errorMessage = '';
        draft.diagnostics.rawError = '';
      });

      try {
        const result = await captureManager.start();
        const nextState = store.getState();
        delayEngine.startCapture({
          sampleRate: nextState.captureSampleRate || 48000,
          channelCount: nextState.captureChannelCount || 2,
          delaySeconds: nextState.targetDelaySeconds,
          volume: nextState.volume,
          muted: nextState.muted,
        });
        store.setState((draft) => {
          draft.permissionStatus = 'granted';
          draft.captureStatus = 'capturing';
          draft.statusMessage = draft.hasAudioTrack
            ? 'Capture active. Waiting for enough buffered audio.'
            : 'Capture active, but no audio track is available.';
          draft.warningMessage = draft.hasAudioTrack
            ? ''
            : 'No audio detected. Try sharing a browser tab and enable audio.';
          draft.strategy =
            result.strategy === 'script-processor-fallback'
              ? 'Legacy ScriptProcessor capture + ring buffer + scheduled playback'
              : 'AudioWorklet capture + ring buffer + scheduled playback';
        });
        logger.info('Capture started.', result.strategy);
      } catch (error) {
        const formatted = formatError(error);
        logger.error('Capture failed.', error);
        store.setState((draft) => {
          draft.permissionStatus = error?.name === 'NotAllowedError' ? 'denied' : 'error';
          draft.errorMessage = formatted;
          draft.diagnostics.rawError = formatted;
          draft.captureStatus = 'inactive';
          draft.captureStreamActive = false;
          draft.statusMessage = 'Unable to start capture.';
        });
        await captureManager.stop().catch(() => {});
        await delayEngine.stopCapture();
      }
    },
    async stopCapture() {
      await stopCapture();
    },
    async startPlayback() {
      await startPlayback();
    },
    async stopPlayback() {
      await stopPlayback();
    },
    async resetSession() {
      logger.info('Resetting session.');
      await stopCapture();
      await delayEngine.reset();
      store.setState((state) => {
        state.captureStatus = 'inactive';
        state.playbackStatus = 'stopped';
        state.captureStreamActive = false;
        state.hasAudioTrack = false;
        state.audioTrackCount = 0;
        state.captureSampleRate = 0;
        state.captureChannelCount = 0;
        state.bufferedSeconds = 0;
        state.bufferingProgress = 0;
        state.activeDelaySeconds = 0;
        state.sourceAudioFlowing = false;
        state.meterLevel = 0;
        state.engineState = 'idle';
        state.errorMessage = '';
        state.warningMessage = state.support.notes[0] ?? '';
        state.statusMessage = 'Session reset. Ready to capture.';
        state.permissionStatus = 'idle';
        state.diagnostics.rawError = '';
      });
    },
    setDelay(delaySeconds) {
      applyDelay(delaySeconds, false);
    },
    setCustomDelay(delaySeconds) {
      applyDelay(delaySeconds, true);
    },
    adjustDelay(delta) {
      applyDelay(store.getState().targetDelaySeconds + delta, true);
    },
    setVolume(volume) {
      store.setState((state) => {
        state.volume = volume;
      });
      delayEngine.configure({ delaySeconds: store.getState().targetDelaySeconds, volume, muted: store.getState().muted });
    },
    toggleMute() {
      store.setState((state) => {
        state.muted = !state.muted;
      });
      const state = store.getState();
      delayEngine.configure({ delaySeconds: state.targetDelaySeconds, volume: state.volume, muted: state.muted });
    },
    setAutoStart(value) {
      store.setState((state) => {
        state.autoStartWhenReady = value;
      });
    },
  };

  view.diagnosticsToggle.addEventListener('click', () => {
    const current = store.getState().diagnosticsOpen;
    store.setState((state) => {
      state.diagnosticsOpen = !current;
    });
  });

  store.subscribe((state) => {
    view.diagnosticsToggle.setAttribute('aria-expanded', String(state.diagnosticsOpen));
    view.diagnosticsToggle.textContent = state.diagnosticsOpen ? 'Hide diagnostics' : 'Show diagnostics';
    view.diagnosticsPanel.hidden = !state.diagnosticsOpen;
    renderDelayControls(view.delayControls, state, actions);
    renderCaptureControls(view.captureControls, state, actions);
    renderPlaybackControls(view.playbackControls, state, actions);
    renderStatus(view.statusPanel, state);
    renderDiagnostics(view.diagnosticsPanel, state);
  });

  function applyDelay(delaySeconds, syncCustomValue) {
    const clamped = Math.max(APP_CONFIG.minDelaySeconds, Math.min(APP_CONFIG.maxDelaySeconds, Number(delaySeconds) || APP_CONFIG.defaultDelaySeconds));
    store.setState((state) => {
      state.targetDelaySeconds = clamped;
      state.selectedDelaySeconds = clamped;
      if (syncCustomValue) state.customDelaySeconds = clamped;
      state.statusMessage = 'Delay updated.';
      state.warningMessage = state.captureStatus === 'capturing'
        ? 'Delay changed. Restart capture or playback to rebuild the rolling buffer for the new target.'
        : state.warningMessage;
    });
    const state = store.getState();
    delayEngine.configure({ delaySeconds: clamped, volume: state.volume, muted: state.muted });
    if (state.captureStatus === 'capturing') {
      actions.resetSession().then(() => logger.warn('Delay changed during a session; engine reset for a clean rebuffer.'));
    }
  }

  async function startPlayback() {
    try {
      await delayEngine.startPlayback();
      store.setState((state) => {
        state.errorMessage = '';
        state.statusMessage = 'Delayed playback active.';
      });
      logger.info('Delayed playback started.');
    } catch (error) {
      handleError('Playback failed to start.', error);
    }
  }

  async function stopPlayback() {
    await delayEngine.stopPlayback();
    store.setState((state) => {
      state.playbackStatus = 'stopped';
      state.statusMessage = state.captureStatus === 'capturing' ? 'Capture active. Playback stopped.' : 'Playback stopped.';
    });
  }

  async function stopCapture() {
    await captureManager.stop().catch(() => {});
    await delayEngine.stopCapture();
    store.setState((state) => {
      state.captureStatus = 'inactive';
      state.playbackStatus = 'stopped';
      state.captureStreamActive = false;
      state.statusMessage = 'Capture stopped.';
      state.bufferedSeconds = 0;
      state.bufferingProgress = 0;
      state.activeDelaySeconds = 0;
      state.engineState = 'idle';
      state.sourceAudioFlowing = false;
      state.meterLevel = 0;
    });
  }

  async function handleCaptureEnded() {
    await stopCapture();
    store.setState((state) => {
      state.warningMessage = 'Capture ended. Start capture again if you want to continue listening.';
      state.statusMessage = 'Capture ended.';
    });
  }

  function handleError(message, error) {
    const formatted = formatError(error);
    logger.error(message, error);
    store.setState((state) => {
      state.errorMessage = message;
      state.warningMessage = '';
      state.diagnostics.rawError = formatted;
      state.statusMessage = formatted;
    });
  }
}
