import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Text } from 'panelui-native';
import { useApi } from '../api/useApi';
import { useBrand } from '../brand/BrandProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

const COPY: Record<string, { text: string; action: string; color: string; icon: any }> = {
  not_started: { text: 'Verify your identity to unlock all banking features.', action: 'Verify now', color: '#b45309', icon: 'shield-checkmark' },
  rejected: { text: 'Your identity verification was rejected.', action: 'Submit again', color: '#dc2626', icon: 'shield-checkmark' },
  pending: { text: 'Your documents are being reviewed. We will notify you once the check is complete.', action: 'View status', color: '#2d60ff', icon: 'information-circle' },
};

export default function KycBanner() {
  const router = useRouter();
  const { t } = usePreferences();
  const { requireKyc } = useBrand();
  const { data } = useApi<any>('/me/kyc');
  const copy = data ? COPY[data.status] : undefined;
  if (!copy) return null;

  const blocked = requireKyc && data.status !== 'pending';
  const reason = data.status === 'rejected' && data.rejectionReason ? ` ${t('Reason')}: ${data.rejectionReason}` : '';

  return (
    <Pressable className="mx-5 mb-2 flex-row items-center gap-3 rounded-2xl bg-card p-3" onPress={() => router.push('/verification')}>
      <Ionicons color={copy.color} name={copy.icon} size={24} />
      <View className="flex-1 gap-0.5">
        <Text size="sm">
          {t(copy.text)}
          {blocked ? ` ${t('Operations are blocked until verification is complete.')}` : ''}
          {reason}
        </Text>
        <Text size="sm" weight="semibold" style={{ color: copy.color }}>{t(copy.action)}</Text>
      </View>
    </Pressable>
  );
}
