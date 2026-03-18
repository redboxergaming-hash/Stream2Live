import { formatPercent, formatSeconds, formatSignedSeconds } from '../utils/formatters.js';

export function renderStatsPanel(container, state) {
  const bufferState = state.bufferHealth > 0.95 ? 'Buffer healthy' : state.bufferHealth > 0.6 ? 'Buffer filling' : 'Building buffer';
  container.innerHTML = `
    <div class="panel-head stacked">
      <div>
        <p class="eyebrow">Live telemetry</p>
        <h2>${formatSeconds(state.effectiveDelaySeconds)}</h2>
        <p class="hero-subtle">Estimated effective delay</p>
      </div>
      <span class="state-pill ${state.playbackState === 'playing' ? 'playing' : 'idle'}">${state.playbackState === 'playing' ? 'Playing delayed audio' : 'Playback paused'}</span>
    </div>

    <div class="stat-grid">
      <article class="stat-card">
        <span>Base delay</span>
        <strong>${formatSeconds(state.baseDelaySeconds)}</strong>
      </article>
      <article class="stat-card">
        <span>Current target</span>
        <strong>${formatSeconds(state.targetDelaySeconds)}</strong>
      </article>
      <article class="stat-card">
        <span>Sync error</span>
        <strong>${formatSignedSeconds(state.syncErrorSeconds)}</strong>
      </article>
      <article class="stat-card">
        <span>Correction rate</span>
        <strong>${state.syncCorrectionRate.toFixed(3)}×</strong>
      </article>
    </div>

    <div class="health-card">
      <div class="meter-head"><span>${bufferState}</span><span>${formatPercent(state.bufferHealth)}</span></div>
      <div class="health-bar"><span style="width:${Math.min(100, Math.round(state.bufferHealth * 100))}%"></span></div>
      <div class="stat-list compact">
        <div><span>Capture</span><strong>${state.streamConnected ? 'Connected' : 'Offline'}</strong></div>
        <div><span>Sync state</span><strong>${state.syncMode.replace('-', ' ')}</strong></div>
        <div><span>Read head</span><strong>${formatSeconds(state.readHeadSeconds)}</strong></div>
        <div><span>Write head</span><strong>${formatSeconds(state.writeHeadSeconds)}</strong></div>
      </div>
    </div>
  `;
}
