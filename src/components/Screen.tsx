import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Alert, Spinner, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrandColor } from '../brand/BrandProvider';
import KycBanner from './KycBanner';
import KycPrompt from './KycPrompt';
import HomeTopBar from './HomeTopBar';
import { usePreferences } from '../preferences/PreferencesProvider';

type ScreenProps = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: ReactNode;
  headerRight?: ReactNode;
  topInset?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  home?: boolean;
  topPadding?: number;
};

export default function Screen({
  title,
  subtitle,
  loading,
  error,
  refreshing = false,
  onRefresh,
  children,
  headerRight,
  topInset = true,
  icon,
  home = false,
  topPadding,
}: ScreenProps) {
  const { mode } = usePreferences();
  const iconColor = useBrandColor();
  const insets = useSafeAreaInsets();
  const top = topPadding ?? insets.top;

  // The web preview draws NativeTabs as a floating bar over the content, so it needs extra room.
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: topInset && !home && Platform.OS === 'web' ? 56 : 0 }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {home ? <HomeTopBar /> : null}
      {home ? <KycBanner /> : null}
      {home ? <KycPrompt /> : null}
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} /> : undefined}
      >
        {icon ? (
          <View className="items-center gap-3 pb-2" style={{ paddingTop: topInset && !home ? top : 0 }}>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
              <Ionicons color={iconColor} name={icon} size={44} />
            </View>
            <Text size="2xl" weight="semibold">{title}</Text>
            {subtitle ? <Text size="sm" muted>{subtitle}</Text> : null}
          </View>
        ) : (
          <View className="gap-1" style={{ paddingTop: topInset && !home ? top : 0 }}>
            {home ? null : <Text size="2xl" weight="semibold">{title}</Text>}
            {subtitle ? <Text size="sm" muted>{subtitle}</Text> : null}
            {headerRight}
          </View>
        )}
        {error ? (
          <Alert variant="destructive">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {loading ? <View className="items-center py-10"><Spinner /></View> : children}
      </ScrollView>
    </View>
  );
}
