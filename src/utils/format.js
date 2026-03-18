export function formatSeconds(value) {
  if (!Number.isFinite(value)) return '0.0s';
  return `${value.toFixed(1)}s`;
}

export function formatBoolean(value) {
  return value ? 'Yes' : 'No';
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}
