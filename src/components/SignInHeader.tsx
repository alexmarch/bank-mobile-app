import { Image, View } from 'react-native';
import { Button, Menu, MoonIcon, SunIcon, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../brand/BrandProvider';
import { usePreferences } from '../preferences/PreferencesProvider';
import type { AppLocale } from '../localization/i18n';
import BrandSymbol from '../../assets/signin/brand-symbol.png';

export const localeOptions: { value: AppLocale; flag: string; label: string }[] = [
  { value: 'en', flag: '🇬🇧', label: 'English' },
  { value: 'fr', flag: '🇫🇷', label: 'Français' },
  { value: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { value: 'ru', flag: '🇷🇺', label: 'Русский' },
];

export default function SignInHeader() {
  const { locale, mode, setLocale, toggleMode, t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const brand = useBrand();
  const current = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];

  return (
    <View className="w-full flex-row items-center justify-between bg-card px-5 pb-3" style={{ paddingTop: top + 12 }}>
      <View className="flex-row items-center gap-2">
        <Image accessibilityElementsHidden source={brand.logoUrl ? { uri: brand.logoUrl } : BrandSymbol} resizeMode="contain" style={{ width: 36, height: 36 }} />
        <Text size="xl" weight="bold">{brand.name}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Menu presentation="bottom-sheet">
          <Menu.Trigger>
            <Button accessibilityLabel={t('Language')} size="icon" variant="secondary">
              <Text size="lg">{current.flag}</Text>
            </Button>
          </Menu.Trigger>
          <Menu.Content align="end" className="shadow-none" style={{ elevation: 0, shadowOpacity: 0 }}>
            {localeOptions.map((option) => (
              <Menu.Item key={option.value} onPress={() => setLocale(option.value)}>
                {`${option.flag}  ${option.label}${option.value === locale ? '  ✓' : ''}`}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
        <Button
          accessibilityLabel={t(mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}
          onPress={toggleMode}
          size="icon"
          variant="secondary"
        >
          {mode === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </Button>
      </View>
    </View>
  );
}
