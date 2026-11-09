import { i18n } from './localization/i18n';

export function formatMoney(minor = 0, currency: string | null = 'USD') {
  const value = Number(minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat(i18n.locale, { style: 'currency', currency: currency || 'USD' }).format(value);
  } catch {
    return `${value.toLocaleString(i18n.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim();
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
