import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SearchBar, Text } from 'panelui-native';
import { useApi } from '../api/useApi';
import { BankCardView, Empty, SectionTitle } from '../components/banking';
import { PrimaryButton } from '../components/fields';
import Screen from '../components/Screen';
import { formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';

export const CARD_APPLICATION_COLORS: Record<string, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };
const PALETTE = ['#343c6a', '#ff8200', '#1814f3', '#fa00ff', '#16dbcc', '#fe5c73'];

function ExpenseStatistics({ items }: { items: any[] }) {
  const { t } = usePreferences();
  const total = items.reduce((sum, item) => sum + Number(item.amountMinor ?? 0), 0);

  return (
    <View className="gap-4 rounded-3xl bg-card p-5">
      {items.length && total > 0 ? (
        <>
          <View className="h-5 flex-row overflow-hidden rounded-full">
            {items.map((item, index) => (
              <View key={item.name} style={{ backgroundColor: PALETTE[index % PALETTE.length], flex: Number(item.amountMinor ?? 0) }} />
            ))}
          </View>
          {items.map((item, index) => (
            <View className="flex-row items-center gap-3" key={item.name}>
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} />
              <Text className="flex-1" numberOfLines={1}>{t(item.name)}</Text>
              <Text weight="semibold">{`${Math.round((Number(item.amountMinor ?? 0) / total) * 100)}%`}</Text>
            </View>
          ))}
        </>
      ) : <Text size="sm" muted>{t('No transactions found')}</Text>}
    </View>
  );
}

function CardListItem({ card, onPress }: { card: any; onPress: () => void }) {
  const { t } = usePreferences();
  const blocked = card.status === 'blocked';
  const rows: [string, string][] = [
    ['Card Type', t(card.cardType ?? '—')],
    ['Bank', card.accountName ?? '—'],
    ['Card Number', `**** ${card.lastFour}`],
    ['Name On Card', card.cardholderName ?? '—'],
  ];

  return (
    <View className={`gap-3 rounded-3xl bg-card p-5 ${blocked ? 'border border-destructive' : ''}`}>
      {rows.map(([label, value]) => (
        <View className="flex-row items-center justify-between gap-3" key={label}>
          <Text size="sm" muted>{t(label)}</Text>
          <Text className="flex-1 text-right" numberOfLines={1} weight="medium">{value}</Text>
        </View>
      ))}
      {blocked ? (
        <View className="flex-row items-center gap-1 self-start rounded-full bg-destructive px-3 py-1">
          <Ionicons color="#ffffff" name="lock-closed" size={12} />
          <Text className="text-white" size="xs" weight="semibold">{t('Blocked')}</Text>
        </View>
      ) : null}
      <Pressable className="items-center rounded-full border border-primary py-2" onPress={onPress}>
        <Text className="text-primary" weight="medium">{t('View Details')}</Text>
      </Pressable>
    </View>
  );
}

export default function CardsScreen() {
  const { t } = usePreferences();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useApi<any>('/me/cards-page');
  const applications = useApi<any[]>('/me/card-applications');
  const [query, setQuery] = useState('');
  const cards: any[] = data?.cards ?? [];
  const open = (card: any) => router.push({ pathname: '/card-details', params: { id: String(card.id) } });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) =>
      [card.accountName, `**** ${card.lastFour}`, card.cardholderName, card.cardType, t(card.cardType ?? '')].some((value) =>
        String(value ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [cards, query, t]);

  const reload = () => {
    void refresh();
    void applications.refresh();
  };

  return (
    <Screen icon="card-outline" error={error} loading={loading && !data} onRefresh={reload} refreshing={refreshing} title={t('Cards')}>
      {data && cards.length === 0 ? (
        <>
          <Empty
            actionLabel="Add card"
            description="Add a card to pay for purchases and manage it in the app."
            icon="card-outline"
            onAction={() => router.push('/card-application')}
            size="page"
            title="No cards yet"
          />
          {applications.data?.length ? (
            <>
              <SectionTitle>My Card Applications</SectionTitle>
              <View className="gap-3 rounded-3xl bg-card p-5">
                {applications.data.map((item) => (
                  <View className="flex-row items-center justify-between gap-3" key={item.id}>
                    <View className="flex-1">
                      <Text weight="semibold">{`${item.network} · ${t(item.cardType)}`}</Text>
                      <Text size="sm" muted>{item.cardholderName}</Text>
                    </View>
                    <Text size="sm" style={{ color: CARD_APPLICATION_COLORS[item.status] ?? '#718ebf' }} weight="semibold">{t(item.status)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : data ? (
        <>
          <SectionTitle>My Cards</SectionTitle>
          {cards.length ? (
            <ScrollView
              contentContainerStyle={{ gap: 12 }}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
            >
              <View className="w-4" />
              {cards.map((card, index) => (
                <Pressable key={card.id} onPress={() => open(card)} style={{ width: 300 }}>
                  <BankCardView card={card} index={index} />
                </Pressable>
              ))}
              <View className="w-4" />
            </ScrollView>
          ) : null}

          <SectionTitle>Card Expense Statistics</SectionTitle>
          <ExpenseStatistics items={data.expenseStats ?? []} />

          <SectionTitle>Card List</SectionTitle>
          <SearchBar autoCapitalize="none" onChangeText={setQuery} placeholder={t('Search cards')} value={query} />
          {filtered.length
            ? filtered.map((card) => <CardListItem card={card} key={card.id} onPress={() => open(card)} />)
            : <Empty icon="card-outline" title="No cards found" />}

          <SectionTitle>Apply for a New Card</SectionTitle>
          <View className="gap-3 rounded-3xl bg-card p-5">
            <Text size="sm" muted>
              {t('Submit an application and our team will review it. Once approved, the card appears in your cards list.')}
            </Text>
            <PrimaryButton onPress={() => router.push('/card-application')}>{t('Apply for a New Card')}</PrimaryButton>
          </View>

          <SectionTitle>My Card Applications</SectionTitle>
          <View className="gap-3 rounded-3xl bg-card p-5">
            {applications.data?.length ? applications.data.map((item) => (
              <View className="flex-row items-center justify-between gap-3" key={item.id}>
                <View className="flex-1">
                  <Text weight="semibold">{`${item.network} · ${t(item.cardType)}`}</Text>
                  <Text size="sm" muted>{item.cardholderName}</Text>
                  {item.status === 'rejected' && item.rejectionReason ? <Text className="text-destructive" size="sm">{item.rejectionReason}</Text> : null}
                </View>
                <Text size="sm" style={{ color: CARD_APPLICATION_COLORS[item.status] ?? '#718ebf' }} weight="semibold">{t(item.status)}</Text>
              </View>
            )) : <Text size="sm" muted>{t('No applications yet.')}</Text>}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
