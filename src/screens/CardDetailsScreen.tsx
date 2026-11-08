import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../api/useApi';
import { Empty } from '../components/banking';
import Screen from '../components/Screen';
import { formatDate, formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';

function cardState(card: any) {
  const expiresAt = new Date(card.expirationYear, card.expirationMonth, 0, 23, 59, 59);
  if (card.status === 'blocked') return { label: 'Blocked', color: '#dc2626' };
  if (card.status === 'expired' || expiresAt < new Date()) return { label: 'Expired', color: '#718ebf' };
  if (card.isFrozen) return { label: 'Frozen', color: '#d97706' };
  return { label: 'Active', color: '#16a34a' };
}

function Rows({ rows }: { rows: [string, string][] }) {
  const { t } = usePreferences();
  return (
    <View className="gap-3 rounded-3xl bg-card p-5">
      {rows.map(([label, value]) => (
        <View className="flex-row items-center justify-between gap-3" key={label}>
          <Text size="sm" muted>{t(label)}</Text>
          <Text className="flex-1 text-right" selectable weight="medium">{value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CardDetailsScreen() {
  const { t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useApi<any>('/me/cards-page');
  const card = data?.cards?.find((item: any) => String(item.id) === id);
  const state = card ? cardState(card) : null;
  const currency = card?.accountCurrency;

  return (
    <Screen icon="card-outline" error={error} loading={loading && !data} title={t('Card Details')} topPadding={top + 44}>
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Card Details') }} />
      {card && state ? (
        <>
          <View className="flex-row items-center justify-between rounded-3xl bg-card p-5">
            <View>
              <Text size="sm" muted>{t('Balance')}</Text>
              <Text size="xl" weight="bold">{formatMoney(card.accountBalanceMinor, currency)}</Text>
            </View>
            <Text style={{ color: state.color }} weight="semibold">{t(state.label)}</Text>
          </View>
          <Text size="lg" weight="semibold">{t('Card')}</Text>
          <Rows
            rows={[
              ['Card Number', `**** **** **** ${card.lastFour}`],
              ['Name On Card', card.cardholderName ?? '—'],
              ['Valid thru', `${String(card.expirationMonth).padStart(2, '0')}/${card.expirationYear}`],
              ['Card Type', t(card.cardType ?? '—')],
              ['Network', card.network || '—'],
              ['Status', t(state.label)],
              ['Daily limit', card.dailyLimitMinor ? formatMoney(card.dailyLimitMinor, currency) : t('Not set')],
              ['Issued', formatDate(card.createdAt)],
            ]}
          />
          <Text size="lg" weight="semibold">{t('Linked account')}</Text>
          <Rows
            rows={[
              ['Account', card.accountName ?? '—'],
              ['Account number', card.accountNumber ?? '—'],
              ['IBAN', card.accountIban || '—'],
              ['Currency', currency ?? '—'],
            ]}
          />
        </>
      ) : data ? <Empty icon="card-outline" title="No cards found" /> : null}
    </Screen>
  );
}
