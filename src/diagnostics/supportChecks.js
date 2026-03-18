export function runSupportChecks() {
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasGetDisplayMedia = hasMediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';
  const hasAudioContext = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  const hasAudioWorklet = hasAudioContext && 'audioWorklet' in AudioContext.prototype;
  const isSecureContext = window.isSecureContext;
  const isMobileLike = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const notes = [];
  if (!isSecureContext) notes.push('This app usually requires HTTPS or localhost to use capture APIs.');
  if (!hasGetDisplayMedia) notes.push('Display/tab capture is unavailable in this browser.');
  if (isMobileLike) notes.push('Mobile browsers often do not expose tab audio capture.');

  return {
    hasMediaDevices,
    hasGetDisplayMedia,
    hasAudioContext,
    hasAudioWorklet,
    isSecureContext,
    isMobileLike,
    preferredBrowserHint:
      'Desktop Chromium-based browsers usually provide the most reliable tab audio capture flow.',
    notes,
  };
}
