import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Alert, Spinner, Tabs, Text } from 'panelui-native';
import { useApi } from '../api/useApi';
import { useBrand } from '../brand/BrandProvider';
import { BankCardView, Empty, SectionTitle, Stat, StatusBadge, TransactionList } from '../components/banking';
import { PrimaryButton } from '../components/fields';
import Screen from '../components/Screen';
import { formatDate, formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';
import { ACCOUNT_TYPE_LABELS, PURPOSE_LABELS } from './AccountApplicationScreen';

const APPLICATION_COLORS: Record<string, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };
const STEPS = [
  { title: 'Submit an application', description: 'Choose your account type and currency.', icon: 'document-text-outline' },
  { title: 'Wait for a decision', description: 'We will review your profile details.', icon: 'checkmark-done-outline' },
  { title: 'Use your account', description: 'Your account details will appear here.', icon: 'wallet-outline' },
] as const;

function ApplicationRow({ application }: { application: any }) {
  const { t } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const closed = application.accountStatus === 'closed';
  const details = [
    application.purpose && `${t('Purpose')}: ${t(PURPOSE_LABELS[application.purpose] ?? application.purpose)}`,
    application.accountNumber && `${t('Account number')}: ${application.accountNumber}`,
    application.iban && `IBAN: ${application.iban}`,
    application.rejectionReason && `${t('Reason')}: ${application.rejectionReason}`,
  ].filter(Boolean) as string[];
  const color = closed ? '#718ebf' : APPLICATION_COLORS[application.status] ?? '#718ebf';

  return (
    <Pressable className="gap-1 rounded-2xl bg-card p-4" disabled={!details.length} onPress={() => setExpanded((value) => !value)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text weight="semibold">{application.name}</Text>
          <Text size="sm" muted>
            {`${t(ACCOUNT_TYPE_LABELS[application.accountType] ?? application.accountType)} · ${application.currency} · ${formatDate(application.createdAt)}`}
          </Text>
        </View>
        <Text size="sm" style={{ color }} weight="semibold">{t(closed ? 'Account closed' : application.status)}</Text>
        {details.length ? <Ionicons color="#718ebf" name={expanded ? 'chevron-up' : 'chevron-down'} size={18} /> : null}
      </View>
      {expanded ? details.map((line) => <Text key={line} size="sm" muted>{line}</Text>) : null}
    </Pressable>
  );
}

function Applications({ emptyState }: { emptyState: boolean }) {
  const { t } = usePreferences();
  const router = useRouter();
  const applications = useApi<any[]>('/me/account-applications');
  const pending = applications.data?.some((application) => application.status === 'pending');
  const apply = () => router.push('/account-application');

  const list = applications.data?.length
    ? applications.data.map((application) => <ApplicationRow application={application} key={application.id} />)
    : null;

  if (emptyState) {
    return (
      <>
        <Empty
          actionDisabled={pending}
          actionLabel="Open account"
          description="Open your first account to keep money and make transfers."
          icon="wallet-outline"
          onAction={apply}
          size="page"
          title="No accounts yet"
        />
        {list}
      </>
    );
  }

  return (
    <View className="gap-3 rounded-3xl bg-card p-5">
      <Text size="lg" weight="semibold">{t('Account applications')}</Text>
      <Text size="sm" muted>{t('Apply to open an account. Your account will be opened after review.')}</Text>
      <PrimaryButton disabled={pending} onPress={apply}>{t('Apply to open account')}</PrimaryButton>
      {applications.error ? <Text className="text-destructive" size="sm">{t(applications.error)}</Text> : null}
      {list ?? (applications.data ? <Text size="sm" muted>{t('No account applications yet.')}</Text> : null)}
    </View>
  );
}

function WeeklyChart({ rows, currency }: { rows: any[]; currency: string }) {
  const { t } = usePreferences();
  const value = (item: any, key: 'debit' | 'credit') => Number(item[`${key}Minor`] ?? item[key] ?? 0);
  const max = Math.max(1, ...rows.map((item) => Math.max(value(item, 'debit'), value(item, 'credit'))));
  const debited = rows.reduce((sum, item) => sum + value(item, 'debit'), 0);
  const credited = rows.reduce((sum, item) => sum + value(item, 'credit'), 0);

  return (
    <View className="gap-4 rounded-3xl bg-card p-5">
      <Text size="sm">
        <Text size="sm" weight="bold">{formatMoney(debited, currency)}</Text>
        {` ${t('Debited &')} `}
        <Text size="sm" weight="bold">{formatMoney(credited, currency)}</Text>
        {` ${t('Credited in this Week')}`}
      </Text>
      <View className="flex-row gap-4">
        <View className="flex-row items-center gap-2"><View className="h-3 w-3 rounded-full bg-primary" /><Text size="xs" muted>{t('Debit')}</Text></View>
        <View className="flex-row items-center gap-2"><View className="h-3 w-3 rounded-full" style={{ backgroundColor: '#16dbcc' }} /><Text size="xs" muted>{t('Credit')}</Text></View>
      </View>
      {rows.length ? (
        <View className="h-44 flex-row items-end justify-between">
          {rows.map((item) => (
            <View className="items-center gap-2" key={item.day}>
              <View className="h-36 flex-row items-end gap-1">
                <View className="w-2.5 rounded-full bg-primary" style={{ height: Math.max(4, Math.round((value(item, 'debit') / max) * 140)) }} />
                <View className="w-2.5 rounded-full" style={{ backgroundColor: '#16dbcc', height: Math.max(4, Math.round((value(item, 'credit') / max) * 140)) }} />
              </View>
              <Text size="xs" muted>{t(item.day)}</Text>
            </View>
          ))}
        </View>
      ) : <Text size="sm" muted>{t('No transactions found')}</Text>}
    </View>
  );
}

export default function AccountsScreen() {
  const { t } = usePreferences();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useApi<any>('/me/accounts-page');
  const [filter, setFilter] = useState('open');
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const accounts: any[] = data?.accounts ?? [];
  const visible = accounts.filter((account) => (filter === 'closed' ? account.status === 'closed' : account.status !== 'closed'));
  const firstVisibleId = visible[0]?.id;

  useEffect(() => {
    if (selectedId == null && firstVisibleId != null) setSelectedId(firstVisibleId);
  }, [firstVisibleId, selectedId]);

  const overview = useApi<any>(selectedId != null ? `/me/accounts/${selectedId}` : null);
  const stats = overview.data?.account?.id === selectedId ? overview.data : null;
  const selected = stats?.account ?? accounts.find(({ id }) => id === selectedId);
  const currency = selected?.currency ?? accounts.find((account) => account.status !== 'closed')?.currency ?? 'USD';
  const totals = stats?.totals;
  const restriction = stats?.operationRestriction;
  const empty = Boolean(data) && accounts.length === 0;

  const details = useMemo(() => {
    const account = stats?.account;
    if (!account) return [];
    return ([
      ['Account name', account.name],
      ['Account type', account.accountType ? t(ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType) : null],
      ['Account number', account.accountNumber],
      ['IBAN', account.iban],
      ['Currency', account.currency],
      ['Brokerage Account', account.brokerageAccount],
      ['Brokerage Name', account.brokerageName],
      ['SWIFT/BIC', account.swiftBic],
      ['Bank Country', account.bankCountry],
      ['Bank Name', account.bankName],
      ['Bank Address', account.bankAddress],
      ['Reference', account.reference],
    ] as [string, string | null][]).filter(([, value]) => value);
  }, [stats, t]);

  const card = stats?.cards?.[0] ?? null;
  const expenses = (stats?.recentTransactions ?? []).filter((item: any) => item.amountMinor < 0).slice(0, 8);

  const reload = () => {
    void refresh();
    void overview.reload(true);
  };

  return (
    <Screen icon="wallet-outline" error={error} loading={loading && !data} onRefresh={reload} refreshing={refreshing} title={t('Accounts')}>
      {data ? (
        <>
          <Applications emptyState={empty} />
          {empty ? null : (
            <>
              <SectionTitle>Account list</SectionTitle>
              <Tabs
                onValueChange={(value) => {
                  setFilter(value);
                  setSelectedId(null);
                }}
                defaultValue="open"
                variant="segmented"
              >
                <Tabs.List>
                  <Tabs.Trigger value="open">{t('Open accounts')}</Tabs.Trigger>
                  <Tabs.Trigger value="closed">{t('Closed accounts')}</Tabs.Trigger>
                </Tabs.List>
              </Tabs>
              {visible.length ? visible.map((account) => (
                <Pressable
                  className={`flex-row items-center gap-3 rounded-2xl bg-card p-4 ${selectedId === account.id ? 'border-2 border-primary' : 'border-2 border-transparent'}`}
                  key={account.id}
                  onPress={() => setSelectedId(account.id)}
                >
                  <View className="flex-1">
                    <Text weight="semibold">{account.name}</Text>
                    <Text size="sm" muted>{account.accountNumber}</Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text weight="semibold">{formatMoney(account.balanceMinor, account.currency)}</Text>
                    <StatusBadge status={account.status} />
                  </View>
                </Pressable>
              )) : <Empty icon="wallet-outline" title={filter === 'closed' ? 'No closed accounts' : 'No open accounts'} />}

              {restriction ? (
                <Alert variant="destructive">
                  <Alert.Content>
                    <Alert.Title>{t('Restrictions are currently in place pending confirmation.')}</Alert.Title>
                    <Alert.Description>
                      {`${t('Amount')}: ${formatMoney(restriction.amountMinor, restriction.currency)}${restriction.note ? `\n${restriction.note}` : ''}`}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {selectedId != null ? (
                <>
                  {overview.loading && !stats ? <View className="items-center py-4"><Spinner /></View> : null}
                  {overview.error ? (
                    <Alert variant="destructive"><Alert.Content><Alert.Description>{t(overview.error)}</Alert.Description></Alert.Content></Alert>
                  ) : null}
                  {stats ? (
                    <>
                      {details.length ? (
                        <>
                          <SectionTitle>Account details</SectionTitle>
                          <View className="gap-3 rounded-3xl bg-card p-5">
                            {details.map(([label, value]) => (
                              <View key={label}>
                                <Text size="xs" muted>{t(label)}</Text>
                                <Text selectable weight="medium">{value}</Text>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : null}
                      <View className="flex-row flex-wrap gap-3">
                        <Stat label="My Balance" value={formatMoney(totals?.balanceMinor ?? 0, currency)} />
                        <Stat label="Income" value={formatMoney(totals?.incomeMinor ?? 0, currency)} />
                        <Stat label="Expense" value={formatMoney(totals?.expenseMinor ?? 0, currency)} />
                        <Stat label="Total Saving" value={formatMoney(totals?.savingsMinor ?? 0, currency)} />
                      </View>
                      <SectionTitle>Last Transaction</SectionTitle>
                      {stats.recentTransactions?.length
                        ? <TransactionList items={stats.recentTransactions} />
                        : <Empty icon="swap-horizontal-outline" title="No matching transactions" />}
                      <SectionTitle>Debit & Credit Overview</SectionTitle>
                      <WeeklyChart currency={currency} rows={stats.weeklyFlow ?? []} />
                      <View className="flex-row items-center justify-between pt-2">
                        <Text size="lg" weight="semibold">{t('My Card')}</Text>
                        <Text className="text-primary" onPress={() => router.push('/cards')} weight="medium">{t('See All')}</Text>
                      </View>
                      {card ? <BankCardView card={card} /> : <Text size="sm" muted>{t('No cards added yet.')}</Text>}
                      {expenses.length ? (
                        <>
                          <SectionTitle>Invoices Sent</SectionTitle>
                          <View className="rounded-3xl bg-card px-4 py-2">
                            {expenses.map((item: any, index: number) => (
                              <View className={`flex-row items-center justify-between gap-3 py-3 ${index === expenses.length - 1 ? '' : 'border-b border-border'}`} key={item.id}>
                                <View className="flex-1">
                                  <Text numberOfLines={1} weight="medium">{item.counterpartyName}</Text>
                                  <Text size="sm" muted>{formatDate(item.createdAt)}</Text>
                                </View>
                                <Text weight="semibold">{formatMoney(Math.abs(item.amountMinor), item.currency)}</Text>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : visible.length ? <Text size="sm" muted>{t('Select an account to view its card and statistics')}</Text> : null}
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}
