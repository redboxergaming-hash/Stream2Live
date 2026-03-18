export function renderNotifications(container, state) {
  const severity = state.currentError ? 'error' : state.warningMessage ? 'warning' : state.statusSeverity;
  const title = state.currentError ? 'Action needed' : state.statusTitle;
  const body = state.currentError || state.warningMessage || state.statusMessage;
  container.innerHTML = `
    <div class="notice ${severity}">
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
    <div class="stat-list">
      <div><span>Stream state</span><strong>${state.captureState}</strong></div>
      <div><span>Playback</span><strong>${state.playbackState}</strong></div>
      <div><span>Audio track</span><strong>${state.hasAudioTrack ? `${state.audioTrackCount} detected` : 'No track yet'}</strong></div>
      <div><span>Sample rate</span><strong>${state.sampleRate || '—'}</strong></div>
      <div><span>Channels</span><strong>${state.channelCount || '—'}</strong></div>
      <div><span>Last nudge</span><strong>${state.lastNudgeAmount ? `${state.lastNudgeAmount > 0 ? '+' : ''}${state.lastNudgeAmount.toFixed(2)}s` : 'None'}</strong></div>
    </div>
  `;
}
