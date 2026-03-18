import { formatBoolean, formatLogTime, formatSeconds } from '../utils/formatters.js';

export function renderDiagnosticsPanel(container, state) {
  const snapshot = state.diagnostics.lastProcessorSnapshot;
  container.innerHTML = `
    <div class="diagnostics-grid">
      <section>
        <h3>Support</h3>
        <ul class="plain-list">
          <li>getDisplayMedia: ${formatBoolean(state.support.hasGetDisplayMedia)}</li>
          <li>AudioContext: ${formatBoolean(state.support.hasAudioContext)}</li>
          <li>AudioWorklet: ${formatBoolean(state.support.hasAudioWorklet)}</li>
          <li>Secure context: ${formatBoolean(state.support.isSecureContext)}</li>
          <li>Mobile-like UA: ${formatBoolean(state.support.isMobileLike)}</li>
        </ul>
      </section>
      <section>
        <h3>Session</h3>
        <ul class="plain-list">
          <li>Capture active: ${formatBoolean(state.streamConnected)}</li>
          <li>Track count: ${state.audioTrackCount}</li>
          <li>Buffered seconds: ${formatSeconds(state.bufferedSeconds)}</li>
          <li>Target delay: ${formatSeconds(state.targetDelaySeconds)}</li>
          <li>Effective delay: ${formatSeconds(state.effectiveDelaySeconds)}</li>
          <li>Sync error: ${formatSeconds(state.syncErrorSeconds)}</li>
          <li>Sync mode: ${state.syncMode}</li>
          <li>Correction rate: ${state.syncCorrectionRate.toFixed(3)}×</li>
          <li>Read head: ${formatSeconds(state.readHeadSeconds)}</li>
          <li>Write head: ${formatSeconds(state.writeHeadSeconds)}</li>
          <li>Raw error: ${state.diagnostics.rawError || 'None'}</li>
        </ul>
      </section>
      <section>
        <h3>Processor snapshot</h3>
        <pre>${snapshot ? JSON.stringify(snapshot, null, 2) : 'No snapshot yet.'}</pre>
      </section>
      <section>
        <h3>Platform notes</h3>
        <ul>
          ${state.support.notes.map((note) => `<li>${note}</li>`).join('') || '<li>No extra notes.</li>'}
          <li>${state.support.preferredBrowserHint}</li>
        </ul>
      </section>
    </div>
    <section>
      <h3>Event log</h3>
      <ul class="log-list">
        ${state.diagnostics.logs.map((entry) => `<li><div class="log-row"><strong>${entry.level.toUpperCase()}</strong><span>${formatLogTime(entry.timestamp)}</span></div><p>${entry.message}</p>${entry.details ? `<pre>${entry.details}</pre>` : ''}</li>`).join('') || '<li>No events recorded yet.</li>'}
      </ul>
    </section>
  `;
}
