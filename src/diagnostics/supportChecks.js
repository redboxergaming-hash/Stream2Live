export function runSupportChecks() {
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetDisplayMedia = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
  const hasAudioWorklet = hasAudioContext && 'audioWorklet' in AudioContext.prototype;
  const isSecureContext = window.isSecureContext;
  const isMobileLike = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const notes = [];
  if (!isSecureContext) notes.push('Use HTTPS or localhost so browser capture APIs are allowed.');
  if (!hasGetDisplayMedia) notes.push('This browser does not expose tab/window capture through getDisplayMedia().');
  if (isMobileLike) notes.push('Mobile browsers often omit tab audio sharing or stop worklets aggressively.');

  return {
    hasMediaDevices,
    hasGetDisplayMedia,
    hasAudioContext,
    hasAudioWorklet,
    isSecureContext,
    isMobileLike,
    notes,
    preferredBrowserHint: 'Desktop Chromium-based browsers remain the best target for reliable tab-audio capture.',
  };
}
