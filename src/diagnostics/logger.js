import { APP_CONFIG } from '../config.js';
import { formatError } from './errorFormatter.js';

export function createLogger(setState) {
  function push(level, message, details = '') {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[stream2live]', message, details);
    setState((state) => {
      state.diagnostics.logs = [entry, ...state.diagnostics.logs].slice(0, APP_CONFIG.diagnosticsLimit);
    });
  }

  return {
    info(message, details = '') {
      push('info', message, details);
    },
    warn(message, details = '') {
      push('warn', message, details);
    },
    error(message, error) {
      push('error', message, formatError(error));
    },
  };
}
