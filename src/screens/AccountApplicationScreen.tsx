import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Label, Select, Text } from 'panelui-native';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, SecondaryButton, TextField } from '../components/fields';
import RememberMe from '../components/RememberMe';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Current account',
  savings: 'Savings account',
  credit: 'Credit account',
};
export const PURPOSE_LABELS: Record<string, string> = {
  personal: 'Personal expenses and transfers',
  savings: 'Savings',
  business: 'Business use',
};
const CURRENCY_LABELS: Record<string, string> = {
  RUB: 'RUB — Russian ruble',
  USD: 'USD — US dollar',
  EUR: 'EUR — euro',
  TRY: 'TRY — Turkish lira',
};

function maskPhone(phone?: string | null) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return phone;
  const countryCode = phone.trim().startsWith('+') ? `+${digits.slice(0, 1)}` : digits.slice(0, 1);
  return `${countryCode} ••• •••-${digits.slice(-4, -2)}-${digits.slice(-2)}`;
}

export default function AccountApplicationScreen() {
  const { t } = usePreferences();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { session } = useAuth();
  const settings = useApi<any>('/me/settings');
  const [form, setForm] = useState({ name: '', accountType: 'checking', currency: 'RUB', purpose: 'personal', consentAccepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const profile = settings.data?.profile;
  const user = session?.user;
  const name = `${profile?.firstName ?? user?.firstName ?? ''} ${profile?.lastName ?? user?.lastName ?? ''}`.trim() || user?.email || t('Profile details unavailable');

  const select = (key: string, label: string, items: Record<string, string> | string[], labels?: Record<string, string>) => {
    const entries = Array.isArray(items) ? items.map((value) => [value, labels?.[value] ?? value]) : Object.entries(items);
    return (
      <View className="gap-2">
        <Label>{t(label)}</Label>
        <Select
          onValueChange={(value) => setForm((current) => ({ ...current, [key]: value }))}
          presentation="overlay"
          title={t(label)}
          value={(form as any)[key]}
        >
          {entries.map(([value, text]) => <Select.Item key={value} label={t(text)} value={value} />)}
        </Select>
      </View>
    );
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/me/account-applications', {
        name: form.name.trim() || t('Current account'),
        accountType: form.accountType,
        currency: form.currency,
        purpose: form.purpose,
        consentAccepted: form.consentAccepted,
      });
      router.back();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    }
    setBusy(false);
  };

  return (
    <Screen icon="wallet-outline" title={t('Apply to open account')} topPadding={top + 44}>
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Apply to open account') }} />
      <Text className="text-center" size="sm" muted>{t('Choose account settings. Your personal details will be taken from your profile.')}</Text>
      {error ? (
        <Alert variant="destructive"><Alert.Content><Alert.Description>{t(error)}</Alert.Description></Alert.Content></Alert>
      ) : null}
      <View className="flex-row items-center gap-3 rounded-2xl bg-card p-4">
        <Ionicons color="#718ebf" name="person-outline" size={24} />
        <View className="flex-1">
          <Text size="xs" muted>{t('Applicant · from your profile')}</Text>
          <Text weight="semibold">{name}</Text>
          {profile?.phone ? <Text size="sm" muted>{maskPhone(profile.phone)}</Text> : null}
        </View>
        <Ionicons color="#718ebf" name="lock-closed-outline" size={18} />
      </View>
      {select('accountType', 'Account type', ACCOUNT_TYPE_LABELS)}
      {select('currency', 'Account currency', Object.keys(CURRENCY_LABELS), CURRENCY_LABELS)}
      {select('purpose', 'Account opening purpose', PURPOSE_LABELS)}
      <TextField
        label={t('Account name · optional')}
        maxLength={120}
        onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
        placeholder={t('For example, “Everyday expenses”')}
        value={form.name}
      />
      <View className="flex-row items-start gap-3 rounded-2xl bg-accent p-4">
        <Ionicons color="#718ebf" name="information-circle-outline" size={22} />
        <Text className="flex-1" size="sm">
          {t('After review, we will notify you of the decision. Your account will appear here after approval and document signing.')}
        </Text>
      </View>
      <RememberMe
        checked={form.consentAccepted}
        label={`${t('I consent to the')} ${t('processing of personal data')} ${t('for reviewing this application.')}`}
        onChange={(checked) => setForm((current) => ({ ...current, consentAccepted: checked }))}
      />
      <PrimaryButton disabled={!form.consentAccepted} loading={busy} onPress={submit}>{t('Send application')}</PrimaryButton>
      <SecondaryButton onPress={() => router.back()}>{t('Cancel')}</SecondaryButton>
      <Text className="text-center" size="xs" muted>{t('Your data is sent over a secure connection')}</Text>
    </Screen>
  );
}
