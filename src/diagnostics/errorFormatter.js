export function formatError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  return `${error.name ? `${error.name}: ` : ''}${error.message ?? String(error)}`;
}
