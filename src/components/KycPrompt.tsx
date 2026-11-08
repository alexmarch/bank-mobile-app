import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Dialog, Text } from 'panelui-native';
import { useApi } from '../api/useApi';
import { useAuth } from '../auth/AuthProvider';
import { useBrand, useBrandColor } from '../brand/BrandProvider';
import { PrimaryButton } from './fields';
import { usePreferences } from '../preferences/PreferencesProvider';

// One reminder per signed-in user until the app is restarted.
const shownFor = new Set<string>();

export default function KycPrompt() {
  const router = useRouter();
  const { t } = usePreferences();
  const { session } = useAuth();
  const { requireKyc } = useBrand();
  const color = useBrandColor();
  const { data } = useApi<any>('/me/kyc');
  const [open, setOpen] = useState(false);
  const userId = session?.user.email ?? '';

  useEffect(() => {
    if (!data || !userId || shownFor.has(userId)) return;
    if (data.status !== 'not_started' && data.status !== 'rejected') return;
    shownFor.add(userId);
    setOpen(true);
  }, [data, userId]);

  if (!data) return null;
  const rejected = data.status === 'rejected';

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Dialog.Content>
        <View className="gap-4 p-1">
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <Ionicons color={rejected ? '#dc2626' : color} name={rejected ? 'close-circle' : 'alert'} size={30} />
            </View>
            <View className="flex-1 gap-1">
              <Text size="lg" weight="bold">{t(rejected ? 'Identity verification rejected' : 'Verify your identity')}</Text>
              {requireKyc ? <Text size="sm" style={{ color: '#d97706' }} weight="medium">{t('Required for withdrawals')}</Text> : null}
            </View>
          </View>
          <Text muted>
            {rejected && data.rejectionReason
              ? `${t('Reason')}: ${data.rejectionReason}`
              : t('Complete a short check to use all account features.')}
          </Text>
          <PrimaryButton
            onPress={() => {
              setOpen(false);
              router.push('/verification');
            }}
          >
            {`${t('Start verification')} →`}
          </PrimaryButton>
          <Pressable className="items-center py-2" onPress={() => setOpen(false)}>
            <Text muted>{t('Later')}</Text>
          </Pressable>
        </View>
      </Dialog.Content>
    </Dialog>
  );
}
