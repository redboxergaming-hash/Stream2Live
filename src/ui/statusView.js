import { formatBoolean, formatSeconds } from '../utils/format.js';

export function renderStatus(container, state) {
  container.innerHTML = `
    <h2>Status</h2>
    <div class="status-banner ${state.errorMessage ? 'error' : state.warningMessage ? 'warn' : 'ok'}">
      <strong>${state.errorMessage ? 'Error' : state.warningMessage ? 'Heads up' : 'Ready'}</strong>
      <p>${state.errorMessage || state.warningMessage || state.statusMessage}</p>
    </div>

    <div class="meter-wrap">
      <div class="meter-label-row">
        <span>Input level</span>
        <span>${Math.round(state.meterLevel * 100)}%</span>
      </div>
      <div class="meter"><span style="width:${Math.min(100, Math.round(state.meterLevel * 100))}%"></span></div>
    </div>

    <div class="progress-wrap">
      <div class="meter-label-row">
        <span>Buffer fill</span>
        <span>${formatSeconds(state.bufferedSeconds)} / ${formatSeconds(state.targetDelaySeconds)}</span>
      </div>
      <progress max="1" value="${state.bufferingProgress}"></progress>
    </div>

    <dl class="status-grid">
      <div><dt>Engine</dt><dd>${state.engineState}</dd></div>
      <div><dt>Capture</dt><dd>${state.captureStatus}</dd></div>
      <div><dt>Playback</dt><dd>${state.playbackStatus}</dd></div>
      <div><dt>Audio track</dt><dd>${state.hasAudioTrack ? 'Detected' : 'Missing'}</dd></div>
      <div><dt>Track count</dt><dd>${state.audioTrackCount}</dd></div>
      <div><dt>Audio flowing</dt><dd>${formatBoolean(state.sourceAudioFlowing)}</dd></div>
      <div><dt>Target delay</dt><dd>${formatSeconds(state.targetDelaySeconds)}</dd></div>
      <div><dt>Estimated live offset</dt><dd>${formatSeconds(state.activeDelaySeconds)}</dd></div>
      <div><dt>Sample rate</dt><dd>${state.captureSampleRate || '—'}</dd></div>
      <div><dt>Channels</dt><dd>${state.captureChannelCount || '—'}</dd></div>
    </dl>
  `;
}
