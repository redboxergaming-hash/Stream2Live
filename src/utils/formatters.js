export function formatSeconds(value, digits = 2) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(digits)}s`;
}

export function formatSignedSeconds(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}s`;
}

export function formatPercent(value) {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

export function formatBoolean(value) {
  return value ? 'Yes' : 'No';
}

export function formatLogTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}
