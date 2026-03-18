import { formatBoolean, formatSeconds, formatTimestamp } from '../utils/format.js';

export function renderDiagnostics(container, state) {
  const logs = state.diagnostics.logs
    .map(
      (entry) => `
        <li>
          <div class="log-head"><strong>${entry.level.toUpperCase()}</strong><span>${formatTimestamp(entry.timestamp)}</span></div>
          <p>${entry.message}</p>
          ${entry.details ? `<pre>${entry.details}</pre>` : ''}
        </li>`,
    )
    .join('');

  container.innerHTML = `
    <div class="diagnostics-grid">
      <div>
        <h3>Capabilities</h3>
        <ul class="plain-list">
          <li>getDisplayMedia: ${formatBoolean(state.support.hasGetDisplayMedia)}</li>
          <li>AudioContext: ${formatBoolean(state.support.hasAudioContext)}</li>
          <li>AudioWorklet: ${formatBoolean(state.support.hasAudioWorklet)}</li>
          <li>Secure context: ${formatBoolean(state.support.isSecureContext)}</li>
          <li>Mobile-like UA: ${formatBoolean(state.support.isMobileLike)}</li>
        </ul>
      </div>
      <div>
        <h3>Live diagnostics</h3>
        <ul class="plain-list">
          <li>Strategy: ${state.strategy}</li>
          <li>Permission: ${state.permissionStatus}</li>
          <li>Capture stream active: ${formatBoolean(state.captureStreamActive)}</li>
          <li>Playback state: ${state.playbackStatus}</li>
          <li>Buffered seconds: ${formatSeconds(state.bufferedSeconds)}</li>
          <li>Output context: ${state.outputContextState ?? 'n/a'}</li>
          <li>Raw error: ${state.diagnostics.rawError || 'None'}</li>
        </ul>
      </div>
    </div>

    <div class="notes-block">
      <h3>Platform notes</h3>
      <ul>
        ${state.support.notes.map((note) => `<li>${note}</li>`).join('') || '<li>No extra notes.</li>'}
        <li>${state.support.preferredBrowserHint}</li>
      </ul>
    </div>

    <div>
      <h3>Event log</h3>
      <ul class="log-list">${logs || '<li>No diagnostics yet.</li>'}</ul>
    </div>
  `;
}
