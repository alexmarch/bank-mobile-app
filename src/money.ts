import type { AppLocale } from './localization/i18n';

const localeTags: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  tr: 'tr-TR',
  ru: 'ru-RU',
};

function getSeparators(locale: AppLocale) {
  const parts = new Intl.NumberFormat(localeTags[locale]).formatToParts(1234.5);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
  };
}

function isGroupedInteger(value: string, separator: string) {
  const groups = value.split(separator);
  return groups.length > 1
    && /^\d{1,3}$/.test(groups[0])
    && groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

export function parseMoneyToMinorUnits(value: string, locale: AppLocale): number | null {
  let input = value.trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!input || !/^[\d.,]+$/.test(input)) return null;

  const { group: localeGroup } = getSeparators(locale);
  const hasDot = input.includes('.');
  const hasComma = input.includes(',');
  let decimalSeparator: string | null = null;

  if (hasDot && hasComma) {
    decimalSeparator = input.lastIndexOf('.') > input.lastIndexOf(',') ? '.' : ',';
    const groupingSeparator = decimalSeparator === '.' ? ',' : '.';
    const [integerPart] = input.split(decimalSeparator);
    if (!isGroupedInteger(integerPart, groupingSeparator)) return null;
    input = input.replaceAll(groupingSeparator, '');
  } else {
    const separator = hasDot ? '.' : hasComma ? ',' : null;
    if (separator) {
      if (separator === localeGroup && isGroupedInteger(input, separator)) {
        input = input.replaceAll(separator, '');
      } else {
        decimalSeparator = separator;
      }
    }
  }

  if (decimalSeparator) {
    if (input.indexOf(decimalSeparator) !== input.lastIndexOf(decimalSeparator)) return null;
    input = input.replace(decimalSeparator, '.');
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  const minorUnits = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

export function formatMoneyInput(minorUnits: number, locale: AppLocale) {
  return new Intl.NumberFormat(localeTags[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function formatMinorUnitsForApi(minorUnits: number) {
  return `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, '0')}`;
}
