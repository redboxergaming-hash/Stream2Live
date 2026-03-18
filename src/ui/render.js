export function renderAppShell(root) {
  root.innerHTML = `
    <main class="app-shell">
      <header class="hero card">
        <p class="eyebrow">Private-use capture utility</p>
        <h1>Live Audio Delay Companion</h1>
        <p class="lead">Capture audio from another tab or window, buffer it locally in memory, and listen with a rolling live delay.</p>
      </header>

      <section class="card instructions">
        <h2>How to use</h2>
        <ol>
          <li>Open the original stream in another tab and start playback manually.</li>
          <li>Return here and click <strong>Start Capture</strong>.</li>
          <li>In the browser picker, choose the playing tab/window and enable audio sharing if available.</li>
          <li>Wait until the selected delay is buffered, then start delayed playback or let it auto-start.</li>
        </ol>
      </section>

      <section class="grid two-column">
        <div class="card" id="delay-controls"></div>
        <div class="card" id="capture-controls"></div>
      </section>

      <section class="grid two-column">
        <div class="card" id="playback-controls"></div>
        <div class="card" id="status-panel"></div>
      </section>

      <section class="card diagnostics-card">
        <button class="accordion-trigger" id="diagnostics-toggle" type="button" aria-expanded="false">Show diagnostics</button>
        <div id="diagnostics-panel" hidden></div>
      </section>
    </main>
  `;

  return {
    delayControls: root.querySelector('#delay-controls'),
    captureControls: root.querySelector('#capture-controls'),
    playbackControls: root.querySelector('#playback-controls'),
    statusPanel: root.querySelector('#status-panel'),
    diagnosticsPanel: root.querySelector('#diagnostics-panel'),
    diagnosticsToggle: root.querySelector('#diagnostics-toggle'),
  };
}
