import { Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../api/useApi';
import { BankCardView, Empty, SectionTitle, TransactionList } from '../components/banking';
import QuickActions from '../components/QuickActions';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = usePreferences();
  const { data, error, loading, refreshing, refresh } = useApi('/me/accounts-page');

  return (
    <Screen
      home
      error={error}
      loading={loading}
      onRefresh={refresh}
      refreshing={refreshing}
      subtitle={`${t('Welcome back')}${session?.user.firstName ? `, ${session.user.firstName}` : ''}`}
      title={session?.user.firstName || t('Home')}
    >
      {data ? (
        <>
          <SectionTitle>My Cards</SectionTitle>
          {data.cards.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {data.cards.map((card: any, index: number) => (
                <Pressable
                  className="w-[300px]"
                  key={card.id}
                  onPress={() => router.push({ pathname: '/card-details', params: { id: String(card.id) } })}
                >
                  <BankCardView card={card} index={index} />
                </Pressable>
              ))}
            </ScrollView>
          ) : <Empty description="Add a card to pay for purchases and manage it in the app." icon="card-outline" title="No cards yet" />}
          <QuickActions />
          <SectionTitle>Recent Transactions</SectionTitle>
          {data.recentTransactions.length
            ? <TransactionList items={data.recentTransactions.slice(0, 6)} />
            : <Empty description="Transactions will appear here after your first payment or transfer." icon="swap-horizontal-outline" title="No transactions yet" />}
        </>
      ) : null}
    </Screen>
  );
}
