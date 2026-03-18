import { APP_CONFIG } from '../config.js';
import { formatSeconds, formatSignedSeconds } from '../utils/formatters.js';

export function renderGuidePanel(container) {
  container.innerHTML = `
    <div class="guide-header">
      <div>
        <h2>Simple flow</h2>
        <p>Start the original stream in another tab, capture it here, wait for a healthy buffer, then use live sync nudges while you listen.</p>
      </div>
      <ol class="guide-steps">
        <li>Start original stream</li>
        <li>Capture the tab with audio</li>
        <li>Wait for healthy buffer</li>
        <li>Use live sync nudges</li>
      </ol>
    </div>
  `;
}

export function renderCapturePanel(container, state, actions) {
  container.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>Connection</h2>
        <p>Use browser-approved tab or window capture. The original page stays untouched.</p>
      </div>
      <span class="state-pill ${state.captureState}">${state.streamConnected ? 'Connected to stream capture' : 'Awaiting capture'}</span>
    </div>
    <div class="action-grid two-up">
      <button class="primary-btn" id="start-capture" ${!state.support.hasGetDisplayMedia ? 'disabled' : ''}>Start capture</button>
      <button class="secondary-btn" id="stop-capture" ${!state.streamConnected ? 'disabled' : ''}>Stop capture</button>
      <button class="ghost-btn" id="start-playback" ${!state.streamConnected ? 'disabled' : ''}>Start delayed playback</button>
      <button class="ghost-btn" id="stop-playback" ${state.playbackState !== 'playing' ? 'disabled' : ''}>Stop playback</button>
    </div>
  `;

  container.querySelector('#start-capture').onclick = actions.startCapture;
  container.querySelector('#stop-capture').onclick = actions.stopCapture;
  container.querySelector('#start-playback').onclick = actions.startPlayback;
  container.querySelector('#stop-playback').onclick = actions.stopPlayback;
}

export function renderDelayPanel(container, state, actions) {
  container.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>Base delay</h2>
        <p>Choose the main listening delay. The live sync panel can nudge around this baseline while playback continues.</p>
      </div>
      <div class="delay-badge">Base ${formatSeconds(state.baseDelaySeconds, 1)}</div>
    </div>
    <div class="chip-row">
      ${APP_CONFIG.delayPresets.map((delay) => `<button type="button" class="chip ${state.baseDelaySeconds === delay ? 'active' : ''}" data-preset="${delay}">${delay}s</button>`).join('')}
    </div>
    <div class="field-row">
      <label class="field grow">
        <span>Custom base delay</span>
        <input id="custom-base-delay" type="number" min="${APP_CONFIG.minDelaySeconds}" max="${APP_CONFIG.maxDelaySeconds}" step="0.25" value="${state.baseDelaySeconds}" />
      </label>
      <button class="secondary-btn align-end" id="apply-base-delay">Apply base delay</button>
    </div>
  `;

  container.querySelectorAll('[data-preset]').forEach((button) => {
    button.onclick = () => actions.setBaseDelay(Number(button.dataset.preset));
  });
  container.querySelector('#apply-base-delay').onclick = () => actions.setBaseDelay(Number(container.querySelector('#custom-base-delay').value));
}

export function renderSyncPanel(container, state, actions) {
  container.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>Live sync</h2>
        <p>Make small timing corrections while playback continues. Larger changes trigger a controlled resync instead of tearing down capture.</p>
      </div>
      <span class="sync-state ${state.syncMode}">${state.syncMode.replace('-', ' ')}</span>
    </div>
    <div class="nudge-grid">
      ${APP_CONFIG.quickNudges.map((amount) => `<button type="button" class="${amount < 0 ? 'ghost-btn' : 'secondary-btn'}" data-nudge="${amount}">${formatSignedSeconds(amount)}</button>`).join('')}
    </div>
    <label class="field">
      <span>Fine sync slider (${formatSignedSeconds(state.syncOffsetSeconds)})</span>
      <input id="sync-slider" type="range" min="${-APP_CONFIG.maxLiveOffsetSeconds}" max="${APP_CONFIG.maxLiveOffsetSeconds}" step="0.05" value="${state.syncOffsetSeconds}" />
    </label>
    <div class="action-grid two-up compact">
      <button class="secondary-btn" id="return-base-delay">Return to base delay</button>
      <button class="ghost-btn" id="controlled-resync">Controlled resync now</button>
    </div>
    <p class="micro-copy">Current sync target: <strong>${formatSeconds(state.targetDelaySeconds)}</strong> · Effective delay: <strong>${formatSeconds(state.effectiveDelaySeconds)}</strong></p>
  `;

  container.querySelectorAll('[data-nudge]').forEach((button) => {
    button.onclick = () => actions.nudgeDelay(Number(button.dataset.nudge));
  });
  container.querySelector('#sync-slider').oninput = (event) => actions.setSyncOffset(Number(event.target.value));
  container.querySelector('#return-base-delay').onclick = actions.resetSyncOffset;
  container.querySelector('#controlled-resync').onclick = actions.forceResync;
}

export function renderAudioPanel(container, state, actions) {
  container.innerHTML = `
    <div class="panel-head">
      <div>
        <h2>Output</h2>
        <p>Control delayed playback loudness and auto-start behavior.</p>
      </div>
      <div class="level-pill">${Math.round(state.meterLevel * 100)}% live level</div>
    </div>
    <label class="field">
      <span>Output volume</span>
      <input id="volume" type="range" min="0" max="1" step="0.01" value="${state.volume}" />
    </label>
    <div class="action-grid two-up compact">
      <button class="secondary-btn" id="mute-toggle">${state.muted ? 'Unmute' : 'Mute'}</button>
      <label class="toggle-row"><input id="auto-start" type="checkbox" ${state.autoStart ? 'checked' : ''} /><span>Auto-start when buffer is healthy</span></label>
    </div>
    <button class="ghost-btn full-width" id="reset-session">Reset session</button>
  `;

  container.querySelector('#volume').oninput = (event) => actions.setVolume(Number(event.target.value));
  container.querySelector('#mute-toggle').onclick = actions.toggleMute;
  container.querySelector('#auto-start').onchange = (event) => actions.setAutoStart(event.target.checked);
  container.querySelector('#reset-session').onclick = actions.resetSession;
}
