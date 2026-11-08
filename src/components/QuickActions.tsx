import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Text } from 'panelui-native';
import { useBrandColor } from '../brand/BrandProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

const actions: { label: string; href: Href; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { label: 'Internal Transfer', href: '/transfer/internal', icon: 'swap-horizontal-outline' },
  { label: 'SWIFT Transfer', href: '/transfer/swift', icon: 'logo-euro' },
  { label: 'SEPA Transfer', href: '/transfer/sepa', icon: 'business-outline' },
];

export default function QuickActions() {
  const router = useRouter();
  const { t } = usePreferences();
  const color = useBrandColor();
  return (
    <View className="flex-row justify-between gap-2 pt-2">
      {actions.map((action) => (
        <Pressable accessibilityRole="button" className="flex-1 items-center gap-2" key={action.label} onPress={() => router.push(action.href)}>
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Ionicons color={color} name={action.icon} size={30} />
          </View>
          <Text className="text-center" size="xs" weight="medium">{t(action.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
