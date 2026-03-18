export function formatError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  const name = error.name ? `${error.name}: ` : '';
  const message = error.message ?? String(error);
  return `${name}${message}`;
}
