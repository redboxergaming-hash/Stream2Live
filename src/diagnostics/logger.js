import { APP_CONFIG } from '../config.js';
import { formatError } from './errorFormatter.js';

export function createLogger(updateState) {
  return {
    info(message, details = null) {
      pushEntry(updateState, 'info', message, details);
    },
    warn(message, details = null) {
      pushEntry(updateState, 'warn', message, details);
    },
    error(message, error = null) {
      pushEntry(updateState, 'error', message, error ? formatError(error) : null);
    },
  };
}

function pushEntry(updateState, level, message, details) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    level,
    message,
    details,
  };
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[delay-app]', message, details ?? '');
  updateState((state) => {
    state.diagnostics.logs = [entry, ...state.diagnostics.logs].slice(0, APP_CONFIG.diagnosticsLimit);
  });
}
