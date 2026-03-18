# Live Audio Delay Companion

A private-use standalone web app that captures audio from another browser tab or window through the browser's built-in screen/tab sharing flow, buffers the captured PCM audio in memory, and plays it back with a rolling configurable delay.

## What this app does

- Lets you manually start a live stream on the original public website in a separate tab.
- Uses `navigator.mediaDevices.getDisplayMedia()` so you can choose that tab/window through the browser's normal permission UI.
- Extracts audio from the returned `MediaStream` using the Web Audio API.
- Buffers audio locally in memory with a bounded rolling buffer.
- Plays back delayed audio at fixed offsets like 5s, 10s, 15s, 20s, or a custom value.
- Discards already-played audio so the app behaves like a live delay companion, not an archive recorder.

## What this app does not do

- It does **not** inspect or control the original site's DOM.
- It does **not** require the direct stream URL.
- It does **not** modify the original website.
- It does **not** guarantee support in every browser or mobile platform.
- It is **not** a downloader, ripper, or recorder-first application.

## Why this architecture exists

The earlier browser-wrapper idea fails on many modern stream pages because cross-origin iframes, sandboxing rules, and protected media players prevent direct DOM/player access. This app abandons that design and instead uses browser-approved tab/window capture as the integration boundary.

That means the app only depends on:

1. You manually starting the stream yourself.
2. The browser allowing tab/window capture with audio.
3. Local audio buffering and delayed playback after capture begins.

## Implementation notes

- **Why tab/window capture was chosen:** it is the browser-supported path that works without direct access to the original page internals.
- **Why direct page integration was abandoned:** cross-origin and sandbox restrictions make embedded player control unreliable or impossible.
- **Why MP3/re-encoding was not used:** re-encoding adds complexity, latency, and unnecessary file/archive semantics. The app keeps PCM in memory instead.
- **How memory-bounded rolling buffering works:** the app stores incoming PCM in a fixed-size circular/ring buffer sized to `target delay + headroom`; as playback consumes frames, old data is dropped and never archived.
- **Main browser limitations:** tab audio capture support varies by browser, OS, and whether you share a browser tab versus a full screen/window.

## Recommended environment

- Best target: recent **desktop Chromium-based browsers**.
- Usually weaker or unavailable: Safari, Firefox tab-audio flows, many mobile browsers, and locked-down enterprise environments.
- For local development, run on `localhost` with HTTPS-like secure context behavior from Vite.

## How to run

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

To build production assets:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## How to use

1. Open the original stream in another browser tab.
2. Start playback manually on the original site.
3. Open this app.
4. Choose a delay preset or enter a custom delay.
5. Click **Start Capture**.
6. In the browser picker, select the tab/window with the stream.
7. If the browser offers an audio sharing toggle, enable it.
8. Wait for the buffer progress to reach the target delay.
9. Click **Start Delayed Playback** or leave auto-start enabled.
10. Use **Stop Playback**, **Stop Capture**, or **Reset Session** as needed.

## Browser limitations

- `getDisplayMedia()` may be missing entirely in unsupported browsers.
- Some browsers allow display capture but do **not** provide audio tracks for certain share targets.
- Some browsers only expose shared audio when you select a **browser tab**, not an arbitrary window or screen.
- Mobile support may be absent or extremely limited.
- Output playback still depends on user interaction and the browser allowing the `AudioContext` to run.

## Diagnostics included in the app

The diagnostics panel reports:

- Browser capability checks.
- Whether `getDisplayMedia` exists.
- Whether audio tracks were returned.
- The processing strategy used.
- Buffer fill level and playback readiness.
- Output context state.
- Errors, warnings, and raw exception messages.
- Platform limitation notes.

## Troubleshooting

### No audio after capture

- Re-run capture and choose a **browser tab** instead of the whole screen when possible.
- Make sure the browser's **Share audio** checkbox/toggle is enabled.
- Confirm the original stream is actually playing and audible.
- Check the diagnostics panel for `audioTrackCount` and raw error details.

### Buffering is stuck at zero

- The selected source may not be sending an audio track.
- The original tab may be paused, muted, or blocked.
- Your browser may support display capture but not tab audio capture for that target.

### Capture ended suddenly

- The user may have stopped sharing.
- The source tab/window may have closed.
- The browser/OS may have interrupted the captured session.

### Start playback is disabled

- The target delay has not been buffered yet.
- Capture is not active.
- The selected source does not include an audio track.

### Browser picker did not offer audio

- Try a desktop Chromium browser.
- Try sharing a browser tab rather than a screen or generic window.
- Some browsers/platforms simply do not expose system/tab audio in this flow.

## Manual validation checklist

Because automated browser media capture tests are difficult in headless CI, use this practical checklist during local manual testing:

1. Verify unsupported browsers show honest support warnings.
2. Start capture and confirm permission status changes from requesting to granted or denied.
3. Verify the no-audio-track case displays a clear warning.
4. Confirm buffering progresses while the source stream is actively playing.
5. Confirm delayed playback only starts after enough audio is buffered.
6. Confirm stop/reset cleans up capture and resets state.
7. Confirm diagnostics logs update with meaningful events.
8. Confirm localStorage restores last-used delay and volume preferences.

## Future improvements

- Optional output auto-recovery after interruptions.
- More accurate delay estimation and drift reporting.
- Better visual audio meters.
- Saved favorite presets.
- Chrome extension or Electron variant using richer tab-capture APIs.
- Worklet-driven output scheduler for even tighter timing.
