import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Drawer, Text } from 'panelui-native';
import { localeOptions } from './SignInHeader';
import type { AppLocale } from '../localization/i18n';
import { useAuth } from '../auth/AuthProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function ProfileDrawer({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { t, mode, locale, setLocale } = usePreferences();
  const icon = mode === 'dark' ? '#93a4c4' : '#60779e';
  const user = session?.user;

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href as any);
  };
  const row = (name: any, label: string, onPress: () => void) => (
    <Pressable className="flex-row items-center gap-4 px-5 py-4" onPress={onPress}>
      <Ionicons color={icon} name={name} size={24} />
      <Text size="lg">{label}</Text>
    </Pressable>
  );

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content side="start" size="md">
        <View className="gap-1 px-5 pb-4 pt-14">
          <Text size="lg" weight="bold">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}</Text>
          <Text size="sm" muted>{user?.email}</Text>
        </View>
        <View className="h-px bg-border" />
        {row('settings', t('Settings'), () => go('/settings'))}
        {row('shield-checkmark', t('Verification'), () => go('/verification'))}
        <View className="h-px bg-border" />
        <View className="gap-3 px-5 py-4">
          <Text size="sm" muted>{t('Language')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {localeOptions.map((option) => {
              const active = option.value === locale;
              return (
                <Pressable
                  className={`rounded-full border px-3 py-2 ${active ? 'border-primary bg-accent' : 'border-border'}`}
                  key={option.value}
                  onPress={() => setLocale(option.value as AppLocale)}
                >
                  <Text size="sm" weight={active ? 'semibold' : 'normal'}>{`${option.flag}  ${option.label}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="h-px bg-border" />
        {row('log-out-outline', t('Sign out'), () => {
          onOpenChange(false);
          // Sign out once the drawer has finished closing so it is not torn down mid-animation.
          setTimeout(() => void signOut(), 350);
        })}
      </Drawer.Content>
    </Drawer>
  );
}
