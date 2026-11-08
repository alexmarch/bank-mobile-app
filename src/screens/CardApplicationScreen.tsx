import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Alert, Label, Select, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { PrimaryButton, SecondaryButton, TextField } from '../components/fields';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

export default function CardApplicationScreen() {
  const { t } = usePreferences();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const accounts = useApi<any>('/me/accounts-page');
  const openAccounts: any[] = (accounts.data?.accounts ?? []).filter((account: any) => !account.status || account.status === 'active');
  const [accountId, setAccountId] = useState('');
  const [cardType, setCardType] = useState('virtual');
  const [network, setNetwork] = useState('Visa');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedAccount = accountId || String(openAccounts[0]?.id ?? '');
  const valid = Boolean(selectedAccount) && name.trim().length >= 2;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/me/card-applications', {
        accountId: Number(selectedAccount),
        cardType,
        network,
        cardholderName: name.trim(),
      });
      router.back();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    }
    setBusy(false);
  };

  const field = (label: string, value: string, onChange: (value: string) => void, items: [string, string][]) => (
    <View className="gap-2">
      <Label>{t(label)}</Label>
      <Select onValueChange={onChange} presentation="overlay" title={t(label)} value={value}>
        {items.map(([itemValue, text]) => <Select.Item key={itemValue} label={text} value={itemValue} />)}
      </Select>
    </View>
  );

  return (
    <Screen icon="card-outline" loading={accounts.loading && !accounts.data} title={t('Apply for a New Card')} topPadding={top + 44}>
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Apply for a New Card') }} />
      <Text size="sm" muted>
        {t('Submit an application and our team will review it. Once approved, the card appears in your cards list.')}
      </Text>
      {error ? <Alert variant="destructive"><Alert.Content><Alert.Description>{t(error)}</Alert.Description></Alert.Content></Alert> : null}
      {field('Account', selectedAccount, setAccountId, openAccounts.map((account) => [String(account.id), `${account.name} · ${account.currency}`]))}
      {field('Card Type', cardType, setCardType, [['virtual', t('Virtual')], ['physical', t('Physical')]])}
      {field('Network', network, setNetwork, [['Visa', 'Visa'], ['Mastercard', 'Mastercard']])}
      <TextField autoComplete="cc-name" label={t('Name On Card')} maxLength={60} onChangeText={setName} value={name} />
      <PrimaryButton disabled={!valid} loading={busy} onPress={submit}>{t('Submit application')}</PrimaryButton>
      <SecondaryButton onPress={() => router.back()}>{t('Cancel')}</SecondaryButton>
    </Screen>
  );
}
