import { APP_CONFIG } from '../config.js';
import { createStore } from './state.js';
import { runSupportChecks } from '../diagnostics/supportChecks.js';
import { createLogger } from '../diagnostics/logger.js';
import { formatError } from '../diagnostics/errorFormatter.js';
import { CaptureManager } from '../audio/captureManager.js';
import { DelayEngine } from '../audio/delayEngine.js';
import { computeSyncPlan } from '../audio/syncController.js';
import { renderLayout } from '../ui/layout.js';
import { renderAudioPanel, renderCapturePanel, renderDelayPanel, renderGuidePanel, renderSyncPanel } from '../ui/controls.js';
import { renderStatsPanel } from '../ui/statsPanel.js';
import { renderNotifications } from '../ui/notifications.js';
import { renderDiagnosticsPanel } from '../ui/diagnosticsPanel.js';

export function createAppController(root) {
  const store = createStore(runSupportChecks());
  const logger = createLogger(store.setState);
  const view = renderLayout(root);
  renderGuidePanel(view.guidePanel);

  const delayEngine = new DelayEngine({
    onTelemetry(snapshot) {
      store.setState((state) => {
        state.bufferedSeconds = snapshot.bufferedSeconds;
        state.effectiveDelaySeconds = snapshot.effectiveDelaySeconds;
        state.syncErrorSeconds = snapshot.syncErrorSeconds;
        state.syncMode = snapshot.syncMode;
        state.syncCorrectionRate = snapshot.correctionRate;
        state.readHeadSeconds = snapshot.readHeadSeconds;
        state.writeHeadSeconds = snapshot.writeHeadSeconds;
        state.bufferHealth = Math.min(1, snapshot.bufferedSeconds / Math.max(state.targetDelaySeconds + 1, 1));
        state.diagnostics.lastProcessorSnapshot = snapshot;
        state.resyncRecommended = Math.abs(snapshot.syncErrorSeconds) > APP_CONFIG.largeAdjustmentThresholdSeconds;
        if (state.playbackState === 'playing' && snapshot.syncMode === 'steady') {
          state.statusTitle = 'Holding stable';
          state.statusMessage = `Holding stable at ${snapshot.effectiveDelaySeconds.toFixed(1)}s.`;
          state.statusSeverity = 'success';
        }
      });
    },
    onNeedsResync() {
      store.setState((state) => {
        state.resyncRecommended = true;
        state.warningMessage = 'The sync offset has drifted far from target. A controlled resync may help.';
      });
    },
  });

  const captureManager = new CaptureManager({
    onChunk(channels, peak) {
      delayEngine.appendChunk(channels);
      store.setState((state) => {
        state.meterLevel = peak;
      });
      const state = store.getState();
      if (state.autoStart && state.playbackState !== 'playing' && state.bufferedSeconds >= state.targetDelaySeconds * 0.92) {
        actions.startPlayback().catch((error) => handleError('Auto-start playback failed.', error));
      }
    },
    onEnded() {
      logger.warn('Stream capture ended.', 'The browser or user stopped sharing the captured source.');
      actions.stopCapture();
      store.setState((state) => {
        state.warningMessage = 'The stream capture ended. Start capture again to continue delayed playback.';
        state.statusTitle = 'Capture ended';
        state.statusMessage = 'The shared tab/window stopped sending audio.';
        state.statusSeverity = 'warning';
      });
    },
    onTrackInfo(info) {
      store.setState((state) => {
        state.streamConnected = info.active ?? state.streamConnected;
        state.audioTrackCount = info.audioTrackCount ?? state.audioTrackCount;
        state.hasAudioTrack = info.hasAudioTrack ?? state.hasAudioTrack;
        state.sampleRate = info.sampleRate ?? state.sampleRate;
        state.channelCount = info.channelCount ?? state.channelCount;
      });
    },
  });

  const actions = {
    async startCapture() {
      const state = store.getState();
      if (!state.support.hasGetDisplayMedia) {
        return setError(
          'Capture unsupported',
          'This browser does not support tab/window capture. Try a recent desktop Chromium browser.',
        );
      }

      await actions.stopCapture();
      store.setState((draft) => {
        draft.permissionState = 'requesting';
        draft.captureState = 'requesting';
        draft.statusTitle = 'Awaiting permission';
        draft.statusMessage = 'Choose the live stream tab/window and enable audio sharing if the browser offers it.';
        draft.statusSeverity = 'info';
        draft.currentError = '';
        draft.warningMessage = '';
        draft.diagnostics.rawError = '';
      });

      try {
        await captureManager.start();
        const next = store.getState();
        await delayEngine.init({
          sampleRate: next.sampleRate || 48000,
          channelCount: next.channelCount || 2,
          baseDelaySeconds: next.baseDelaySeconds,
          volume: next.volume,
          muted: next.muted,
        });
        store.setState((draft) => {
          draft.captureState = 'capturing';
          draft.permissionState = 'granted';
          draft.streamConnected = true;
          draft.playbackState = 'buffering';
          draft.statusTitle = 'Connected to stream capture';
          draft.statusMessage = 'Audio is flowing. Build a healthy buffer, then start playback or let auto-start take over.';
          draft.statusSeverity = 'success';
          draft.strategy = 'AudioWorklet capture + AudioWorklet rolling-delay playback';
        });
        logger.info('Capture connected.', 'AudioWorklet capture and delay processor are active.');
      } catch (error) {
        setError('Capture failed', formatError(error), error);
        await captureManager.stop().catch(() => {});
        await delayEngine.reset().catch(() => {});
      }
    },
    async stopCapture() {
      await captureManager.stop().catch(() => {});
      await delayEngine.reset().catch(() => {});
      store.setState((state) => {
        state.streamConnected = false;
        state.captureState = 'idle';
        state.playbackState = 'stopped';
        state.bufferedSeconds = 0;
        state.bufferHealth = 0;
        state.effectiveDelaySeconds = 0;
        state.syncErrorSeconds = 0;
        state.syncMode = 'steady';
        state.syncCorrectionRate = 1;
        state.readHeadSeconds = 0;
        state.writeHeadSeconds = 0;
        state.meterLevel = 0;
        state.statusTitle = 'Ready to reconnect';
        state.statusMessage = 'Capture is stopped. Start it again whenever you are ready.';
        state.statusSeverity = 'info';
      });
    },
    async startPlayback() {
      try {
        await delayEngine.startPlayback();
        store.setState((state) => {
          state.playbackState = 'playing';
          state.statusTitle = 'Delayed playback active';
          state.statusMessage = 'Listening with live sync control. Use nudges to make fine timing corrections.';
          state.statusSeverity = 'success';
        });
        logger.info('Delayed playback started.');
      } catch (error) {
        handleError('Playback failed to start.', error);
      }
    },
    stopPlayback() {
      delayEngine.stopPlayback();
      store.setState((state) => {
        state.playbackState = state.streamConnected ? 'buffering' : 'stopped';
        state.statusTitle = 'Playback paused';
        state.statusMessage = 'Capture is still available. Start playback again when you want to listen.';
        state.statusSeverity = 'info';
      });
    },
    setBaseDelay(seconds) {
      const current = store.getState();
      const clamped = clampDelay(seconds);
      const plan = computeSyncPlan(current.targetDelaySeconds, clamped);
      store.setState((state) => {
        state.baseDelaySeconds = clamped;
        state.syncOffsetSeconds = 0;
        state.targetDelaySeconds = clamped;
        state.lastNudgeAmount = 0;
        state.lastNudgeDirection = 'none';
        state.warningMessage = plan.strategy === 'resync' ? 'Large base delay change requested. Performing controlled resync.' : '';
        state.statusTitle = plan.strategy === 'resync' ? 'Controlled resync in progress' : 'Base delay updated';
        state.statusMessage = plan.strategy === 'resync'
          ? `Repositioning playback to the new ${clamped.toFixed(2)}s base delay without recapturing the stream.`
          : `Base delay is now ${clamped.toFixed(2)}s.`;
        state.statusSeverity = plan.strategy === 'resync' ? 'warning' : 'info';
      });
      if (current.streamConnected) {
        delayEngine.setBaseDelay(clamped);
        delayEngine.setTargetDelay(clamped, plan.strategy);
      }
    },
    nudgeDelay(amount) {
      applySyncOffset(store.getState().syncOffsetSeconds + amount, amount);
    },
    setSyncOffset(offset) {
      const nextOffset = Math.max(-APP_CONFIG.maxLiveOffsetSeconds, Math.min(APP_CONFIG.maxLiveOffsetSeconds, offset));
      applySyncOffset(nextOffset, nextOffset - store.getState().syncOffsetSeconds);
    },
    resetSyncOffset() {
      applySyncOffset(0, -store.getState().syncOffsetSeconds);
    },
    forceResync() {
      const state = store.getState();
      if (!state.streamConnected) return;
      delayEngine.setTargetDelay(state.targetDelaySeconds, 'resync');
      store.setState((draft) => {
        draft.syncMode = 'controlled-resync';
        draft.warningMessage = 'Large sync change requested. Performing controlled resync.';
        draft.statusTitle = 'Controlled resync in progress';
        draft.statusMessage = 'Capture keeps running while playback gently realigns to the requested delay.';
        draft.statusSeverity = 'warning';
      });
      logger.warn('Controlled resync requested by user.');
    },
    setVolume(volume) {
      store.setState((state) => {
        state.volume = volume;
      });
      const state = store.getState();
      delayEngine.setVolume({ volume: state.volume, muted: state.muted });
    },
    toggleMute() {
      store.setState((state) => {
        state.muted = !state.muted;
      });
      const state = store.getState();
      delayEngine.setVolume({ volume: state.volume, muted: state.muted });
    },
    setAutoStart(enabled) {
      store.setState((state) => {
        state.autoStart = enabled;
      });
    },
    async resetSession() {
      await actions.stopCapture();
      store.setState((state) => {
        state.syncOffsetSeconds = 0;
        state.targetDelaySeconds = state.baseDelaySeconds;
        state.currentError = '';
        state.warningMessage = state.support.notes[0] ?? '';
        state.diagnostics.rawError = '';
      });
      logger.info('Session reset.');
    },
  };

  view.diagnosticsToggle.onclick = () => {
    store.setState((state) => {
      state.diagnosticsOpen = !state.diagnosticsOpen;
    });
  };

  store.subscribe((state) => {
    view.heroConnectionPill.textContent = state.streamConnected ? 'Connected' : 'Idle';
    view.heroConnectionPill.className = `state-pill ${state.streamConnected ? 'capturing' : 'idle'}`;
    view.diagnosticsToggle.textContent = state.diagnosticsOpen ? 'Hide advanced diagnostics' : 'Show advanced diagnostics';
    view.diagnosticsToggle.setAttribute('aria-expanded', String(state.diagnosticsOpen));
    view.diagnosticsPanel.hidden = !state.diagnosticsOpen;

    renderCapturePanel(view.capturePanel, state, actions);
    renderDelayPanel(view.delayPanel, state, actions);
    renderSyncPanel(view.syncPanel, state, actions);
    renderAudioPanel(view.audioPanel, state, actions);
    renderStatsPanel(view.statsPanel, state);
    renderNotifications(view.notificationsPanel, state);
    renderDiagnosticsPanel(view.diagnosticsPanel, state);
  });

  function applySyncOffset(nextOffset, deltaAmount) {
    const state = store.getState();
    const clampedOffset = Math.max(-APP_CONFIG.maxLiveOffsetSeconds, Math.min(APP_CONFIG.maxLiveOffsetSeconds, nextOffset));
    const nextTarget = clampDelay(state.baseDelaySeconds + clampedOffset);
    const plan = computeSyncPlan(state.targetDelaySeconds, nextTarget);

    store.setState((draft) => {
      draft.syncOffsetSeconds = clampedOffset;
      draft.targetDelaySeconds = nextTarget;
      draft.syncNudgePending = true;
      draft.lastNudgeAmount = deltaAmount;
      draft.lastNudgeDirection = deltaAmount > 0 ? 'later' : deltaAmount < 0 ? 'earlier' : 'none';
      draft.syncMode = plan.strategy === 'resync' ? 'controlled-resync' : draft.syncMode;
      draft.warningMessage = plan.strategy === 'resync' ? 'Large sync change requested. Performing controlled resync.' : '';
      draft.statusTitle = plan.strategy === 'resync' ? 'Controlled resync in progress' : `Applying ${deltaAmount >= 0 ? '+' : ''}${deltaAmount.toFixed(2)}s sync adjustment`;
      draft.statusMessage = plan.strategy === 'resync'
        ? 'Capture remains live while playback repositions to the new target delay.'
        : deltaAmount >= 0
          ? 'Gently falling back to increase the live delay.'
          : 'Gently catching up to reduce the live delay.';
      draft.statusSeverity = plan.strategy === 'resync' ? 'warning' : 'info';
    });

    if (state.streamConnected) {
      delayEngine.setTargetDelay(nextTarget, plan.strategy);
      logger.info('Sync target updated.', `${deltaAmount >= 0 ? '+' : ''}${deltaAmount.toFixed(2)}s via ${plan.strategy}.`);
    }
  }

  function setError(title, message, error = null) {
    if (error) logger.error(title, error);
    store.setState((state) => {
      state.currentError = message;
      state.diagnostics.rawError = error ? formatError(error) : message;
      state.statusTitle = title;
      state.statusMessage = message;
      state.statusSeverity = 'error';
    });
  }

  function handleError(title, error) {
    setError(title, formatError(error), error);
  }

  function clampDelay(value) {
    const numeric = Number(value) || APP_CONFIG.defaultBaseDelaySeconds;
    return Math.max(APP_CONFIG.minDelaySeconds, Math.min(APP_CONFIG.maxDelaySeconds, numeric));
  }
}
