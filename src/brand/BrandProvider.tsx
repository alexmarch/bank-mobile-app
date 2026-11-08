import { Appearance } from 'react-native';
import { Uniwind } from 'uniwind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { assetUrl, fetchBankConfig } from '../api/client';
import { usePreferences } from '../preferences/PreferencesProvider';

export type Brand = {
  name: string;
  supportEmail: string | null;
  footerText: string;
  maintenance: boolean;
  requireKyc: boolean;
  googleLogin: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  logoUrl: string | null;
  primary: string | null;
  accent: string | null;
  defaultAppearance: 'light' | 'dark' | 'system';
  supportTopics: string[];
};

const defaults: Brand = {
  name: 'BankDash',
  supportEmail: null,
  footerText: '',
  maintenance: false,
  requireKyc: false,
  googleLogin: true,
  termsUrl: null,
  privacyUrl: null,
  logoUrl: null,
  primary: null,
  accent: null,
  defaultAppearance: 'light',
  supportTopics: [],
};

const BrandContext = createContext<Brand>(defaults);

export const useBrand = () => useContext(BrandContext);

const DEFAULT_PRIMARY = '#2d60ff';
const DEFAULT_ACCENT = '#343c6a';
const HEX = /^#[0-9a-f]{6}$/i;

// Mixes the colour with white so a dark brand colour stays readable on dark surfaces.
function lighten(hex: string, amount: number) {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16);
    return Math.round(value + (255 - value) * amount).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

export function useBrandColor() {
  const { primary } = useBrand();
  const { mode } = usePreferences();
  const base = primary ?? DEFAULT_PRIMARY;
  if (mode === 'dark') return primary ? lighten(primary, 0.35) : '#5277ff';
  return base;
}

const REFRESH_MS = 30_000;

export function BrandProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetchBankConfig().then((data) => active && setConfig(data)).catch(() => {});
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const brand = useMemo<Brand>(() => ({
    name: config?.displayName || defaults.name,
    supportEmail: config?.supportEmail ?? null,
    footerText: config?.branding?.footerText ?? '',
    maintenance: Boolean(config?.maintenanceMode),
    requireKyc: Boolean(config?.requireKyc),
    googleLogin: config?.googleLoginEnabled !== false,
    termsUrl: assetUrl(config?.legal?.termsUrl),
    privacyUrl: assetUrl(config?.legal?.privacyUrl),
    logoUrl: assetUrl(config?.branding?.logoUrl),
    primary: HEX.test(config?.branding?.primaryColor ?? '') ? config.branding.primaryColor.toLowerCase() : null,
    accent: HEX.test(config?.branding?.accentColor ?? '') ? config.branding.accentColor.toLowerCase() : null,
    supportTopics: Array.isArray(config?.supportTopics) ? config.supportTopics : [],
    defaultAppearance: ['light', 'dark', 'system'].includes(config?.branding?.defaultAppearance)
      ? config.branding.defaultAppearance
      : 'light',
  }), [config]);

  const { setDefaultMode } = usePreferences();

  useEffect(() => {
    setDefaultMode(brand.defaultAppearance === 'system'
      ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
      : brand.defaultAppearance);
  }, [brand.defaultAppearance, setDefaultMode]);

  useEffect(() => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    if (brand.primary && brand.primary !== DEFAULT_PRIMARY) {
      const soft = lighten(brand.primary, 0.9);
      const bright = lighten(brand.primary, 0.35);
      for (const key of ['--color-primary', '--color-brand', '--color-ring', '--color-info', '--color-accent-foreground']) light[key] = brand.primary;
      light['--color-secondary'] = soft;
      light['--color-accent'] = soft;
      for (const key of ['--color-primary', '--color-brand', '--color-ring', '--color-info', '--color-accent-foreground']) dark[key] = bright;
    }
    if (brand.accent && brand.accent !== DEFAULT_ACCENT) {
      for (const key of ['--color-card-foreground', '--color-popover-foreground', '--color-overlay-foreground', '--color-secondary-foreground']) light[key] = brand.accent;
    }
    if (Object.keys(light).length) Uniwind.updateCSSVariables('light', light);
    if (Object.keys(dark).length) Uniwind.updateCSSVariables('dark', dark);
  }, [brand.primary, brand.accent]);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}
