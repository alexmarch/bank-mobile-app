import { View } from 'react-native';
import { Button, ChevronLeftIcon, MoonIcon, SunIcon, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '../preferences/PreferencesProvider';

type Props = {
  title: string;
  onBack: () => void;
};

// iOS and web fallback; Android uses the Jetpack Compose TopAppBar in AuthTopBar.android.tsx.
export default function AuthTopBar({ title, onBack }: Props) {
  const { mode, toggleMode, t } = usePreferences();
  const { top } = useSafeAreaInsets();

  return (
    <View className="w-full flex-row items-center gap-2 bg-card px-2 pb-2" style={{ paddingTop: top + 8 }}>
      <Button accessibilityLabel={t('Back')} onPress={onBack} size="icon" variant="ghost">
        <ChevronLeftIcon size={22} />
      </Button>
      <Text className="flex-1" size="lg" weight="semibold" numberOfLines={1}>{title}</Text>
      <Button
        accessibilityLabel={t(mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}
        onPress={toggleMode}
        size="icon"
        variant="ghost"
      >
        {mode === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </Button>
    </View>
  );
}
