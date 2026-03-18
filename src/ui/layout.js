export function renderLayout(root) {
  root.innerHTML = `
    <main class="shell">
      <section class="hero-panel surface">
        <div>
          <p class="eyebrow">Private-use live delay utility</p>
          <h1>Stream2Live Sync Studio</h1>
          <p class="hero-copy">Capture a live stream from another tab, build a healthy rolling buffer, and fine-tune sync in real time without restarting the session.</p>
        </div>
        <div class="hero-badge-wrap">
          <span class="state-pill" id="hero-connection-pill">Idle</span>
        </div>
      </section>

      <section class="guide-panel surface" id="guide-panel"></section>

      <section class="main-grid">
        <div class="primary-column">
          <section class="surface panel" id="capture-panel"></section>
          <section class="surface panel" id="delay-panel"></section>
          <section class="surface panel sync-panel" id="sync-panel"></section>
          <section class="surface panel" id="audio-panel"></section>
        </div>
        <div class="secondary-column">
          <section class="surface panel stats-panel" id="stats-panel"></section>
          <section class="surface panel" id="notifications-panel"></section>
        </div>
      </section>

      <section class="surface panel diagnostics-shell">
        <button class="disclosure-btn" id="diagnostics-toggle" type="button" aria-expanded="false">Show advanced diagnostics</button>
        <div id="diagnostics-panel" hidden></div>
      </section>
    </main>
  `;

  return {
    heroConnectionPill: root.querySelector('#hero-connection-pill'),
    guidePanel: root.querySelector('#guide-panel'),
    capturePanel: root.querySelector('#capture-panel'),
    delayPanel: root.querySelector('#delay-panel'),
    syncPanel: root.querySelector('#sync-panel'),
    audioPanel: root.querySelector('#audio-panel'),
    statsPanel: root.querySelector('#stats-panel'),
    notificationsPanel: root.querySelector('#notifications-panel'),
    diagnosticsPanel: root.querySelector('#diagnostics-panel'),
    diagnosticsToggle: root.querySelector('#diagnostics-toggle'),
  };
}
