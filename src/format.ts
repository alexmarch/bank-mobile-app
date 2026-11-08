export function formatMoney(minor = 0, currency: string | null = 'USD') {
  const value = Number(minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

export function formatDate(value?: string | number | null) {
  if (value == null) return '—';
  const date = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function maskCard(lastFour?: string | null) {
  return lastFour ? `•••• ${String(lastFour).slice(-4)}` : '—';
}
