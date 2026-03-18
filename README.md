# Stream2Live Sync Studio

Stream2Live Sync Studio is a private-use standalone web app for capturing audio from a user-selected browser tab or window, buffering that live audio locally in memory, and listening back with a controllable rolling delay.

## What changed in V2

The first MVP proved the capture-and-delay concept, but it forced users to restart or rebuild the session for meaningful delay changes. That was not acceptable for real listening workflows.

V2 upgrades the app so users can:

- keep capture running,
- keep delayed playback running,
- apply live sync nudges like `-1.0s`, `-0.5s`, `-0.25s`, `+0.25s`, `+0.5s`, `+1.0s`,
- smoothly converge to the new target delay without a full restart for small changes,
- use a controlled resync only for larger adjustments.

## What the app does

- Captures audio from a browser-approved tab/window using `navigator.mediaDevices.getDisplayMedia()`.
- Buffers captured PCM audio locally in a bounded rolling buffer.
- Plays that audio back with a configurable base delay.
- Supports **live sync adjustment while playback continues**.
- Shows real-time telemetry for target delay, effective delay, sync state, correction rate, and buffer health.
- Keeps developer diagnostics available in an expandable lower-priority panel.

## What it does not do

- It does **not** access the original player DOM.
- It does **not** need the direct stream URL.
- It does **not** modify the original website.
- It is **not** a downloader or archiver.
- It does **not** guarantee support on every browser or mobile device.

## Why this architecture is the right foundation

### Why the upgrade was needed

Users needed real-time sync adjustment without restarting the stream or capture session. A live delay tool must behave like a sync instrument, not a one-shot recorder pipeline.

### Why AudioWorklet is the right primitive

Real-time streaming playback and sync manipulation are a strong fit for `AudioWorklet`. In this version:

- one worklet captures PCM from the shared tab/window,
- a dedicated delay playback worklet maintains rolling buffered audio,
- the playback worklet tracks write head, read head, target delay, effective delay, sync error, and correction rate,
- delay adjustments can be applied without tearing the session down.

### Why small sync corrections are soft

Small timing adjustments sound better when the engine converges gradually rather than hard-jumping. This version uses gentle playback-rate correction around `1.0×` for small nudges, which helps avoid obvious artifacts.

### Why large changes use controlled resync

Large jumps are intentionally treated differently. Instead of forcing the user to re-capture the stream, the engine performs a **controlled resync** inside the same session so capture stays alive while playback repositions to the new delay target.

### Why the UI was redesigned

The app is no longer presented as a developer utility. The interface was reworked into a cleaner, more premium, progressive-disclosure layout with clear primary actions, real-time stat cards, and advanced diagnostics tucked away behind a disclosure control.

## How live sync works

### Base delay

The base delay is your normal listening offset, such as `10s`, `15s`, or `20s`.

### Sync nudges

The live sync panel lets you temporarily move around that base delay while playback continues:

- negative nudges reduce the delay and gently catch up,
- positive nudges increase the delay and gently fall back,
- the fine slider gives smaller continuous adjustments,
- **Return to base delay** smoothly converges back to the main preset.

### Small vs large adjustments

- **Small changes:** the engine keeps playing and gently converges toward the new target.
- **Larger changes:** the engine performs a controlled resync inside the active session.

The threshold is explicit in the code so behavior stays predictable and maintainable.

## Recommended browser expectations

- Best target: recent **desktop Chromium-based browsers**.
- Safari, Firefox, and many mobile browsers may have weaker support for tab audio capture or AudioWorklet behavior.
- You may need to choose a **browser tab** rather than a generic window/screen for audio sharing to appear.
- The browser may require a user gesture before audio output can start.

## Run locally

```bash
npm install
npm run dev
```

Build production assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## How to use

1. Open the original stream in another browser tab.
2. Start playback on the original site manually.
3. Open Stream2Live Sync Studio.
4. Click **Start capture**.
5. In the browser picker, select the live-stream tab/window and enable audio sharing if offered.
6. Wait until the app reports a healthy buffer.
7. Click **Start delayed playback** or leave auto-start enabled.
8. Use the **Live sync** nudges or fine slider while audio is already playing.
9. Use **Return to base delay** when you want to smoothly settle back to your main preset.

## UI overview

- **Hero bar:** product identity and connection state.
- **Connection panel:** start/stop capture and playback.
- **Base delay panel:** preset chips and custom base delay.
- **Live sync panel:** quick nudges, fine slider, return-to-base, controlled resync.
- **Output panel:** volume, mute, auto-start, reset.
- **Live telemetry panel:** effective delay, target delay, sync error, correction rate, read/write heads, and buffer health.
- **Advanced diagnostics:** support checks, browser metadata, processor snapshot, and event log.

## Troubleshooting

### No audio was detected from the selected tab

Re-open capture and make sure:

- the original stream is actually playing,
- you selected the correct tab/window,
- the browser's **share audio** option was enabled.

### Playback will not start

- Wait until the rolling buffer has enough audio.
- Make sure the browser allowed audio output for the page.
- Try clicking the page again to satisfy autoplay restrictions.

### Sync feels off after many nudges

Use **Return to base delay** or **Controlled resync now**. The app keeps capture active and realigns playback inside the same session.

### Capture ended unexpectedly

The browser, OS, or user likely stopped the shared source. Start capture again to continue.

### Browser picker did not offer audio

This is common outside desktop Chromium browsers, or when sharing a screen/window instead of a browser tab.

## Manual validation checklist

1. Verify unsupported browsers show honest support messaging.
2. Start capture and confirm track/sample/channel metadata populates.
3. Confirm delayed playback starts without needing a page reload.
4. Confirm small sync nudges change target delay while playback keeps running.
5. Confirm larger sync changes trigger controlled resync rather than full teardown.
6. Confirm reset still cleans up capture and playback correctly.
7. Confirm diagnostics update with read/write head, sync error, and correction rate.
8. Confirm saved base delay, sync offset, volume, and mute state restore from local storage.

## Future improvements

- SharedArrayBuffer / worker-backed transport for even tighter real-time behavior.
- Smoother crossfaded controlled resync strategies.
- More advanced audio metering and drift history.
- Preset profiles for different streams.
- Optional Electron or extension build for richer capture APIs.
