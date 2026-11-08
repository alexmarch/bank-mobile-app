import { View } from 'react-native';
import { Item } from 'panelui-native';
import { useApi } from '../api/useApi';
import { Empty, SectionTitle, Stat } from '../components/banking';
import Screen from '../components/Screen';
import { formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';

export default function InvestmentsScreen() {
  const { t } = usePreferences();
  const { data, error, loading, refreshing, refresh } = useApi('/me/investments');
  const currency = data?.currency ?? 'USD';

  return (
    <Screen icon="trending-up-outline" error={error} loading={loading} onRefresh={refresh} refreshing={refreshing} title={t('Investments')} topInset={false}>
      {data ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Stat label="Total Invested" value={formatMoney(data.totalInvestedMinor, currency)} />
            <Stat label="Rate of Return" value={`${data.rateOfReturn ?? 0}%`} />
          </View>
          <SectionTitle>My Investments</SectionTitle>
          {data.items.length ? data.items.map((item: any) => (
            <Item className="bg-card" key={item.id}>
              <Item.Content>
                <Item.Title>{item.name ?? t('Investment')}</Item.Title>
                <Item.Description>{item.category ?? ''}</Item.Description>
              </Item.Content>
              <Item.Actions><Item.Title>{formatMoney(item.amountMinor, item.currency ?? currency)}</Item.Title></Item.Actions>
            </Item>
          )) : <Empty icon="trending-up-outline" title="No investments yet" />}
        </>
      ) : null}
    </Screen>
  );
}
