import { Pressable, View } from 'react-native';
import { Button, Drawer, Spinner, Text } from 'panelui-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useBrandColor } from '../brand/BrandProvider';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { usePreferences } from '../preferences/PreferencesProvider';

const icons: Record<string, { name: any; color: string }> = {
  info: { name: 'information-circle', color: '' },
  success: { name: 'checkmark-circle', color: '#16dbcc' },
  warning: { name: 'warning', color: '#ffb800' },
  security: { name: 'lock-closed', color: '#ff4b4a' },
};

function timeAgo(value: string, t: (key: string) => string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return t('Just now');
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [size, suffix] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${t(suffix === 'd' ? 'd ago' : suffix === 'h' ? 'h ago' : 'min ago')}`;
  }
  return t('Just now');
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void };

export default function NotificationsDrawer({ open, onOpenChange, onChanged }: Props) {
  const { t } = usePreferences();
  const brandColor = useBrandColor();
  const list = useApi<any>(open ? '/notifications?pageSize=30' : null);
  const items: any[] = list.data?.items ?? [];
  const unread = items.some((item) => !item.readAt);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {}).catch(() => {});
    await list.reload(true);
    onChanged();
  };
  const markAll = async () => {
    await api.post('/notifications/read-all', {}).catch(() => {});
    await list.reload(true);
    onChanged();
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content side="end" size="lg">
        <Drawer.Header title={t('Notifications')} />
        <Drawer.Body>
          {list.loading && !list.data ? <Spinner /> : null}
          {!list.loading && items.length === 0 ? <Text muted>{t('No notifications yet')}</Text> : null}
          {items.map((item) => {
            const icon = icons[item.type] ?? icons.info;
            const color = icon.color || brandColor;
            return (
              <Pressable
                className={`mb-2 flex-row gap-3 rounded-2xl p-3 ${item.readAt ? 'bg-card' : 'bg-accent'}`}
                key={item.id}
                onPress={() => (item.readAt ? undefined : markRead(item.id))}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-card">
                  <Ionicons color={color} name={icon.name} size={22} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text weight="semibold">{t(item.title)}</Text>
                  {item.body ? <Text size="sm" muted>{t(item.body)}</Text> : null}
                  <Text size="xs" muted>{timeAgo(item.createdAt, t)}</Text>
                </View>
                {item.readAt ? null : <View className="mt-1 h-2 w-2 rounded-full bg-primary" />}
              </Pressable>
            );
          })}
        </Drawer.Body>
        <Drawer.Footer>
          <Button className="flex-1" disabled={!unread} onPress={markAll} variant="secondary">
            {t('Mark all as read')}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
