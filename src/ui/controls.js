import { APP_CONFIG } from '../config.js';
import { formatSeconds } from '../utils/format.js';

export function renderDelayControls(container, state, actions) {
  container.innerHTML = `
    <h2>Delay controls</h2>
    <div class="preset-row">
      ${APP_CONFIG.delayPresets
        .map(
          (delay) =>
            `<button type="button" class="preset-btn ${state.targetDelaySeconds === delay ? 'active' : ''}" data-delay="${delay}">${delay}s</button>`,
        )
        .join('')}
    </div>
    <label class="field">
      <span>Custom delay (seconds)</span>
      <input id="custom-delay" type="number" min="${APP_CONFIG.minDelaySeconds}" max="${APP_CONFIG.maxDelaySeconds}" step="0.5" value="${state.customDelaySeconds}" />
    </label>
    <div class="inline-actions">
      <button type="button" id="apply-custom-delay">Apply custom delay</button>
      <button type="button" data-adjust="-1">-1s</button>
      <button type="button" data-adjust="-0.5">-0.5s</button>
      <button type="button" data-adjust="0.5">+0.5s</button>
      <button type="button" data-adjust="1">+1s</button>
    </div>
    <p class="support-copy">Selected target delay: <strong>${formatSeconds(state.targetDelaySeconds)}</strong></p>
  `;

  container.querySelectorAll('[data-delay]').forEach((button) => {
    button.addEventListener('click', () => actions.setDelay(Number(button.dataset.delay)));
  });

  container.querySelector('#apply-custom-delay').addEventListener('click', () => {
    const value = Number(container.querySelector('#custom-delay').value);
    actions.setCustomDelay(value);
  });

  container.querySelectorAll('[data-adjust]').forEach((button) => {
    button.addEventListener('click', () => actions.adjustDelay(Number(button.dataset.adjust)));
  });
}

export function renderCaptureControls(container, state, actions) {
  container.innerHTML = `
    <h2>Capture controls</h2>
    <p class="support-copy">Use browser-approved tab/window capture. This app cannot read the original page directly.</p>
    <div class="button-stack">
      <button type="button" id="start-capture" ${!state.support.hasGetDisplayMedia ? 'disabled' : ''}>Start Capture</button>
      <button type="button" id="stop-capture" ${state.captureStatus === 'inactive' ? 'disabled' : ''}>Stop Capture</button>
      <button type="button" id="reset-session">Reset Session</button>
    </div>
  `;
  container.querySelector('#start-capture').addEventListener('click', actions.startCapture);
  container.querySelector('#stop-capture').addEventListener('click', actions.stopCapture);
  container.querySelector('#reset-session').addEventListener('click', actions.resetSession);
}

export function renderPlaybackControls(container, state, actions) {
  container.innerHTML = `
    <h2>Playback controls</h2>
    <div class="button-stack">
      <button type="button" id="start-playback" ${state.bufferedSeconds < state.targetDelaySeconds ? 'disabled' : ''}>Start Delayed Playback</button>
      <button type="button" id="stop-playback" ${state.playbackStatus !== 'playing-delayed' ? 'disabled' : ''}>Stop Delayed Playback</button>
    </div>

    <label class="checkbox-row">
      <input id="auto-start" type="checkbox" ${state.autoStartWhenReady ? 'checked' : ''} />
      <span>Auto-start playback when enough audio is buffered</span>
    </label>

    <label class="field">
      <span>Volume</span>
      <input id="volume" type="range" min="0" max="1" step="0.01" value="${state.volume}" />
    </label>

    <div class="inline-actions">
      <button type="button" id="mute-toggle">${state.muted ? 'Unmute' : 'Mute'}</button>
    </div>
  `;

  container.querySelector('#start-playback').addEventListener('click', actions.startPlayback);
  container.querySelector('#stop-playback').addEventListener('click', actions.stopPlayback);
  container.querySelector('#mute-toggle').addEventListener('click', actions.toggleMute);
  container.querySelector('#auto-start').addEventListener('change', (event) => actions.setAutoStart(event.target.checked));
  container.querySelector('#volume').addEventListener('input', (event) => actions.setVolume(Number(event.target.value)));
}
