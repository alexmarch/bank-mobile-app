import { View } from 'react-native';
import { Item } from 'panelui-native';
import { useApi } from '../api/useApi';
import { Empty, SectionTitle, Stat } from '../components/banking';
import Screen from '../components/Screen';
import { formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';

export default function LoansScreen() {
  const { t } = usePreferences();
  const { data, error, loading, refreshing, refresh } = useApi('/me/loans');
  const currency = data?.currency ?? 'USD';

  return (
    <Screen icon="cash-outline" error={error} loading={loading} onRefresh={refresh} refreshing={refreshing} title={t('Loans')} topInset={false}>
      {data ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Stat label="Principal" value={formatMoney(data.totals.principalMinor, currency)} />
            <Stat label="Remaining" value={formatMoney(data.totals.remainingMinor, currency)} />
            <Stat label="Installment" value={formatMoney(data.totals.installmentMinor, currency)} />
          </View>
          <SectionTitle>Active Loans</SectionTitle>
          {data.loans.length ? data.loans.map((loan: any) => (
            <Item className="bg-card" key={loan.id}>
              <Item.Content>
                <Item.Title>{t(String(loan.loanType ?? loan.type ?? 'Loan'))}</Item.Title>
                <Item.Description>
                  {loan.interestRate != null ? `${loan.interestRate}%` : ''}{loan.termMonths ? ` · ${loan.termMonths} ${t('months')}` : ''}
                </Item.Description>
              </Item.Content>
              <Item.Actions>
                <View className="items-end">
                  <Item.Title>{formatMoney(loan.remainingMinor, loan.currency ?? currency)}</Item.Title>
                  <Item.Description>{formatMoney(loan.installmentMinor, loan.currency ?? currency)}</Item.Description>
                </View>
              </Item.Actions>
            </Item>
          )) : <Empty icon="cash-outline" title="No loans yet" />}
        </>
      ) : null}
    </Screen>
  );
}
