import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, BellIcon, Button, CardIcon, HeadsetIcon, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from '../api/client';
import { useApi } from '../api/useApi';
import { useAuth } from '../auth/AuthProvider';
import NotificationsDrawer from './NotificationsDrawer';
import ProfileDrawer from './ProfileDrawer';
import { useSupportChat } from '../support/SupportChatProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View
      className="absolute -right-1 -top-1 h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1"
      pointerEvents="none"
    >
      <Text className="text-destructive-foreground" size="xs" weight="semibold">{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

export default function HomeTopBar() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const settings = useApi('/me/settings');
  const unread = useApi('/notifications/unread-count');
  const support = useSupportChat();
  const [bellOpen, setBellOpen] = useState(false);
  const reloadUnread = unread.reload;
  useEffect(() => {
    const timer = setInterval(() => void reloadUnread(true), 10_000);
    return () => clearInterval(timer);
  }, [reloadUnread]);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatar = assetUrl(settings.data?.profile?.avatarUrl);
  const initial = (session?.user.firstName || session?.user.email || '?').slice(0, 1).toUpperCase();

  return (
    <View className="w-full flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: top + 8 }}>
      <Pressable accessibilityLabel={t('Settings')} onPress={() => setProfileOpen(true)}>
        <Avatar fallback={initial} size="lg" source={avatar ? { uri: avatar } : undefined} />
      </Pressable>
      <Button
        accessibilityLabel={t('Cards')}
        endContent={<CardIcon size={18} />}
        onPress={() => router.push('/cards')}
        size="md"
        variant="secondary"
      >
        {t('All')}
      </Button>
      <View className="flex-row items-center gap-3">
        <View>
          <Button accessibilityLabel={t('Notifications')} className="rounded-full bg-accent" onPress={() => setBellOpen(true)} size="icon" variant="ghost">
            <BellIcon size={24} />
          </Button>
          <CountBadge count={Number(unread.data?.count ?? 0)} />
        </View>
        <View>
          <Button accessibilityLabel={t('Support')} className="rounded-full bg-accent" onPress={() => router.push('/support-chat')} size="icon" variant="ghost">
            <HeadsetIcon size={24} />
          </Button>
          <CountBadge count={support.unread} />
        </View>
      </View>
      <NotificationsDrawer onChanged={() => void unread.reload(true)} onOpenChange={setBellOpen} open={bellOpen} />
      <ProfileDrawer onOpenChange={setProfileOpen} open={profileOpen} />
    </View>
  );
}
