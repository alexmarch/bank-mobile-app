import { createContext, useCallback, useRef, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useThemeMode, type ThemeMode } from 'panelui-native';
import { i18n, detectLocale, supportedLocales, type AppLocale } from '../localization/i18n';
import { getPreference, setPreference } from './storage';

const THEME_KEY = 'bankdash-mobile-theme';
const LOCALE_KEY = 'bankdash-mobile-locale-v2';

type PreferencesContextValue = {
  ready: boolean;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  mode: ThemeMode;
  toggleMode: () => void;
  setDefaultMode: (mode: ThemeMode) => void;
  t: (key: string) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { mode, setMode, toggleMode } = useThemeMode();
  const [locale, setLocaleState] = useState<AppLocale>(detectLocale);
  const [ready, setReady] = useState(false);
  const storedTheme = useRef<boolean | null>(null);
  const pendingDefault = useRef<ThemeMode | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPreference(THEME_KEY), getPreference(LOCALE_KEY)])
      .then(([savedTheme, savedLocale]) => {
        if (!active) return;
        const nextLocale = supportedLocales.includes(savedLocale as AppLocale)
          ? savedLocale as AppLocale
          : detectLocale();
        const hasSaved = savedTheme === 'dark' || savedTheme === 'light';
        storedTheme.current = hasSaved;
        const nextTheme = hasSaved ? savedTheme as ThemeMode : pendingDefault.current ?? 'light';
        i18n.locale = nextLocale;
        setLocaleState(nextLocale);
        setMode(nextTheme);
      })
      .catch(() => {
        if (active) {
          i18n.locale = locale;
          setMode('light');
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeLocale = useCallback((nextLocale: AppLocale) => {
    i18n.locale = nextLocale;
    setLocaleState(nextLocale);
    void setPreference(LOCALE_KEY, nextLocale);
  }, []);

  const setDefaultMode = useCallback((next: ThemeMode) => {
    pendingDefault.current = next;
    if (storedTheme.current === false) setMode(next);
  }, [setMode]);

  const changeMode = useCallback(() => {
    storedTheme.current = true;
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    void setPreference(THEME_KEY, nextMode);
  }, [mode, setMode]);

  const value = useMemo<PreferencesContextValue>(() => ({
    ready,
    locale,
    setLocale: changeLocale,
    mode,
    toggleMode: changeMode,
    setDefaultMode,
    t: (key) => i18n.t(key),
  }), [changeLocale, changeMode, locale, mode, ready, setDefaultMode]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider');
  return context;
}
