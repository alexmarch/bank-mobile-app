import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let currentToken: string | null = null;

export async function unregisterPushToken() {
  const token = currentToken;
  currentToken = null;
  if (token) await api.post('/notifications/push/device/remove', { token }).catch(() => undefined);
}

async function obtainToken() {
  // Remote push needs a real device and a build with an EAS project id; Expo Go on Android and simulators cannot receive it.
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.MAX });
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 600, 800],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function PushRegistration() {
  const { session } = useAuth();
  const router = useRouter();
  const signedIn = Boolean(session);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void (async () => {
      try {
        const token = await obtainToken();
        if (!token || !active) return;
        await api.post('/notifications/push/device', { token });
        currentToken = token;
      } catch {
        // Push is optional; the app keeps polling for badges.
      }
    })();
    return () => {
      active = false;
    };
  }, [signedIn]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (data?.type === 'call') {
        router.push('/call');
        return;
      }
      const url = data?.url;
      if (typeof url !== 'string') return;
      if (url.startsWith('/support-chat')) router.push('/support-chat');
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);

  return null;
}
