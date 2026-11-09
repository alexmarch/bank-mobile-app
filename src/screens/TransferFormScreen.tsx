import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Alert, Card, Label, Select, Text } from 'panelui-native';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useBrand } from '../brand/BrandProvider';
import { Empty } from '../components/banking';
import { MoneyField, PrimaryButton, SecondaryButton, TextField } from '../components/fields';
import Screen from '../components/Screen';
import { euCountriesData, swiftCountriesData } from '../data/banks';
import { formatMoney } from '../format';
import { formatMinorUnitsForApi, parseMoneyToMinorUnits } from '../money';
import { usePreferences } from '../preferences/PreferencesProvider';

export type TransferType = 'internal' | 'swift' | 'sepa';

const bicPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;
const sepaCountryCodes = new Set([
  'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB',
  'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO',
  'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM', 'VA',
]);
const OTHER = 'other';

const titles: Record<TransferType, string> = {
  internal: 'Internal Transfer',
  swift: 'SWIFT Transfer',
  sepa: 'SEPA Transfer',
};
const icons = {
  internal: 'swap-horizontal-outline',
  swift: 'logo-euro',
  sepa: 'business-outline',
} as const;

function validIban(value: string) {
  const iban = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  let remainder = 0;
  for (const character of `${iban.slice(4)}${iban.slice(0, 4)}`) {
    const digits = character >= 'A' && character <= 'Z' ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 py-1.5">
      <Text className="shrink" size="sm" muted>{label}</Text>
      <Text className="flex-1 text-right" size="sm" weight="semibold">{value}</Text>
    </View>
  );
}

export default function TransferFormScreen({ type }: { type: TransferType }) {
  const { locale, t } = usePreferences();
  const router = useRouter();
  const headerHeight = useSafeAreaInsets().top + 44;
  const { requireKyc } = useBrand();
  const accountsQuery = useApi<any>('/me/accounts-page');
  const kyc = useApi<any>('/me/kyc');
  const history = useApi<any[]>(type === 'internal' ? null : '/me/transfers/external');
  const blocked = requireKyc && kyc.data?.status !== undefined && kyc.data.status !== 'approved';

  const accounts: any[] = (accountsQuery.data?.accounts ?? []).filter((item: any) => item.status === 'active');
  const countries = useMemo(() => {
    const data = type === 'sepa' ? euCountriesData : swiftCountriesData;
    return Object.entries(data)
      .filter(([code]) => type !== 'sepa' || sepaCountryCodes.has(code))
      .map(([code, value]) => ({ code, ...value }));
  }, [type]);

  const [step, setStep] = useState(0);
  const [sourceId, setSourceId] = useState('');
  const [country, setCountry] = useState('');
  const [bank, setBank] = useState('');
  const [recipient, setRecipient] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [account, setAccount] = useState('');
  const [recipientChoice, setRecipientChoice] = useState('');
  const [bicSwift, setBicSwift] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState<any>(null);

  const sourceOptions = type === 'sepa' ? accounts.filter((item) => item.currency === 'EUR') : accounts;
  const source = sourceOptions.find((item) => String(item.id) === sourceId) ?? sourceOptions[0];
  const ownRecipients = type === 'internal'
    ? accounts.filter((item) => item.id !== source?.id && item.currency === source?.currency)
    : [];
  const otherMode = recipientChoice === OTHER || (type === 'internal' && !ownRecipients.length);
  const ownRecipient = ownRecipients.find((item) => String(item.id) === recipientChoice) ?? ownRecipients[0];
  const selectedCountry = countries.find((item) => item.code === country);
  const amountValue = parseMoneyToMinorUnits(amount, locale) ?? 0;
  const restriction = source?.operationRestriction;
  const restrictionOperation = type === 'internal' ? 'transfers' : type;
  const restricted = Boolean(
    restriction && restriction.operations.includes(restrictionOperation)
    && amountValue > Number(restriction.amountMinor),
  );
  const compact = (value: string) => value.replace(/\s+/g, '');

  const beneficiaryName = type === 'swift'
    ? `${firstName.trim()} ${lastName.trim()}`.trim()
    : type === 'internal' && !otherMode ? ownRecipient?.name ?? '' : recipient.trim();
  const amountValid = amountValue > 0
    && amountValue <= 99_999_999_999
    && Boolean(source)
    && amountValue <= Number(source?.balanceMinor ?? 0);
  const accountValid = type === 'internal'
    ? (otherMode ? compact(account).length >= 6 : Boolean(ownRecipient))
    : type === 'sepa'
      ? validIban(account) && compact(account).toUpperCase().startsWith(country)
      : compact(account).length >= 6;
  const bicValid = type !== 'swift' || bicPattern.test(bicSwift);
  const valid = amountValid && !restricted && accountValid && bicValid && (type === 'internal'
    ? true
    : Boolean(country && bank && beneficiaryName.length >= 2 && purpose.trim().length >= 2));
  const err = (ok: boolean, message: string) => (touched && !ok
    ? <Text className="text-destructive" size="sm">{t(message)}</Text>
    : null);

  const summaryAmount = formatMoney(amountValid ? amountValue : 0, source?.currency ?? 'EUR');

  const review = () => {
    setTouched(true);
    if (blocked || !valid) return;
    setFailure('');
    setStep(1);
  };

  const confirm = async () => {
    setBusy(true);
    setFailure('');
    try {
      const data = type === 'internal'
        ? await api.post('/me/transfers', {
          sourceAccountId: source.id,
          recipient: otherMode ? account : ownRecipient?.accountNumber,
          amount: formatMinorUnitsForApi(amountValue),
          note: purpose.trim() || null,
        })
        : await api.post('/me/transfers/external', {
          type,
          sourceAccountId: source.id,
          country,
          bank,
          beneficiaryName,
          account,
          bicSwift: type === 'swift' ? bicSwift : null,
          amount: formatMinorUnitsForApi(amountValue),
          purpose: purpose.trim(),
        });
      setResult(data);
      setStep(2);
      void accountsQuery.reload(true);
      void history.reload(true);
    } catch (submitError) {
      setFailure(submitError instanceof Error ? t(submitError.message) : t('Transfer failed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setTouched(false);
    setAmount('');
    setPurpose('');
    setAccount('');
  };

  const select = (label: string, value: string, onChange: (next: string) => void, items: { value: string; label: string }[], disabled = false) => (
    <View className="gap-2">
      <Label>{label}</Label>
      <Select disabled={disabled} onValueChange={onChange} presentation="overlay" title={label} value={value}>
        {items.map((item) => <Select.Item key={item.value} label={item.label} value={item.value} />)}
      </Select>
    </View>
  );

  return (
    <Screen
      error={accountsQuery.error}
      icon={icons[type]}
      loading={accountsQuery.loading}
      title={t(titles[type])}
      topPadding={headerHeight}
    >
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t(titles[type]) }} />
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

      {accountsQuery.data && !sourceOptions.length ? (
        <Alert variant="warning">
          <Alert.Content>
            <Alert.Description>
              {t(type === 'sepa' ? 'You need an active EUR account for SEPA transfers.' : 'You need an active account to send money.')}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {step === 0 && source ? (
        <View className="gap-4">
          {select(t('From account'), String(source.id), setSourceId, sourceOptions.map((item) => ({
            value: String(item.id),
            label: `${item.name} · ${formatMoney(item.balanceMinor, item.currency)}`,
          })))}

          {type !== 'internal' ? (
            <>
              {select(t(type === 'sepa' ? 'Recipient country' : 'Destination country'), country, (next) => { setCountry(next); setBank(''); },
                countries.map((item) => ({ value: item.code, label: `${item.flag} ${item.name}` })))}
              {err(Boolean(country), 'Select a destination country.')}
              {select(t('Recipient bank'), bank, setBank,
                (selectedCountry?.banks ?? []).map((item) => ({ value: item, label: item })), !selectedCountry)}
              {err(Boolean(bank), 'Select a recipient bank.')}
            </>
          ) : null}

          {type === 'internal' ? (
            <>
              {select(t('Recipient account'), otherMode ? OTHER : String(ownRecipient?.id ?? OTHER), setRecipientChoice, [
                ...ownRecipients.map((item) => ({
                  value: String(item.id),
                  label: `${t('Your account')} · ${item.name} · ${item.accountNumber}`,
                })),
                { value: OTHER, label: t('Another customer account') },
              ])}
              {otherMode ? (
                <>
                  <TextField
                    label={t('Recipient account number')}
                    onChangeText={setAccount}
                    value={account}
                  />
                  {err(accountValid, 'Enter a recipient account number.')}
                </>
              ) : null}
            </>
          ) : null}

          {type === 'swift' ? (
            <>
              <TextField label={t('First name')} onChangeText={setFirstName} value={firstName} />
              {err(firstName.trim().length >= 2, 'Enter the recipient first name.')}
              <TextField label={t('Last name')} onChangeText={setLastName} value={lastName} />
              {err(lastName.trim().length >= 2, 'Enter the recipient last name.')}
              <TextField
                autoCapitalize="characters"
                label={t('SWIFT/BIC code')}
                onChangeText={(next) => setBicSwift(next.toUpperCase())}
                value={bicSwift}
              />
              {err(bicValid, 'Enter a valid SWIFT/BIC code.')}
            </>
          ) : null}

          {type === 'sepa' ? (
            <>
              <TextField label={t('Recipient name')} onChangeText={setRecipient} value={recipient} />
              {err(beneficiaryName.length >= 2, 'Enter the recipient name.')}
            </>
          ) : null}

          {type !== 'internal' ? (
            <>
              <TextField
                autoCapitalize="characters"
                label={t(type === 'sepa' ? 'Recipient IBAN' : 'Account number or IBAN')}
                onChangeText={(next) => setAccount(next.toUpperCase())}
                value={account}
              />
              {err(accountValid, type === 'sepa' ? 'Enter a valid IBAN for the selected country.' : 'Enter a recipient account number or IBAN.')}
            </>
          ) : null}

          <MoneyField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label={`${t('Amount')} (${source.currency})`}
            onChangeText={setAmount}
            placeholder="0.00"
            value={amount}
          />
          {err(amountValid, type === 'sepa' && source.currency !== 'EUR' ? 'SEPA transfers require an EUR account.' : 'Enter a valid amount within the available balance.')}

          {type === 'swift' ? (
            <Alert variant="info">
              <Alert.Content>
                <Alert.Description>{t('No currency conversion is applied. The transfer uses the selected account currency.')}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextField
            label={t(type === 'sepa' ? 'Payment reference' : type === 'swift' ? 'Payment purpose' : 'Comment (optional)')}
            maxLength={140}
            onChangeText={setPurpose}
            value={purpose}
          />
          {err(type === 'internal' || purpose.trim().length >= 2, 'Enter a payment purpose or reference.')}

          {type === 'sepa' ? (
            <Alert variant="info">
              <Alert.Content>
                <Alert.Description>{t('SEPA transfers are in EUR only. No SWIFT/BIC code is needed.')}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {blocked ? (
            <Alert variant="warning">
              <Alert.Content>
                <Alert.Description>{t('Transfers are unavailable until your identity is verified.')}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <PrimaryButton disabled={blocked || !sourceOptions.length} onPress={review}>{t('Review transfer')}</PrimaryButton>
        </View>
      ) : null}

      {step === 1 && source ? (
        <View className="gap-4">
          <Card className="gap-1 p-4">
            <Text size="lg" weight="semibold">{t('Review transfer')}</Text>
            <Text className="pb-2" size="sm" muted>{t('Check the recipient and amount before confirming.')}</Text>
            {type !== 'internal' ? <Row label={t('Recipient country')} value={`${selectedCountry?.flag ?? ''} ${selectedCountry?.name ?? country}`} /> : null}
            {type !== 'internal' ? <Row label={t('Recipient bank')} value={bank} /> : null}
            <Row label={t('Recipient')} value={beneficiaryName || account} />
            {type !== 'internal' ? <Row label={t(type === 'sepa' ? 'Recipient IBAN' : 'Account number or IBAN')} value={account} /> : null}
            {type === 'swift' ? <Row label={t('SWIFT/BIC code')} value={bicSwift} /> : null}
            <Row label={t('From account')} value={`${source.name} · ${formatMoney(source.balanceMinor, source.currency)}`} />
            <Row label={t('Amount')} value={summaryAmount} />
            <Row label={t(type === 'internal' ? 'Comment' : 'Payment purpose')} value={purpose || '—'} />
            <Row label={t('Transfer fee')} value={formatMoney(0, source.currency)} />
            <Row label={t('Total debit')} value={summaryAmount} />
          </Card>
          {type !== 'internal' ? (
            <Alert variant="warning">
              <Alert.Content>
                <Alert.Description>{t('This request will be reviewed by the bank. Funds will not be debited until it is processed.')}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {failure ? (
            <Alert variant="destructive">
              <Alert.Content><Alert.Description>{failure}</Alert.Description></Alert.Content>
            </Alert>
          ) : null}
          <PrimaryButton disabled={blocked} loading={busy} onPress={confirm}>
            {t(type === 'internal' ? 'Confirm and send' : 'Submit transfer request')}
          </PrimaryButton>
          <SecondaryButton disabled={busy} onPress={() => { setFailure(''); setStep(0); }}>{t('Edit details')}</SecondaryButton>
        </View>
      ) : null}

      {step === 2 && result ? (
        <View className="gap-4">
          <Alert variant="success">
            <Alert.Content>
              <Alert.Title>{t(type === 'internal' ? 'Transfer completed' : 'Transfer request submitted')}</Alert.Title>
              <Alert.Description>
                {`${t(type === 'internal' ? 'Your transfer was sent successfully.' : 'Your transfer is pending bank review. No funds have been debited.')}\n${summaryAmount}\n${t('Transfer reference')}: ${result.reference}`}
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <PrimaryButton onPress={() => router.navigate('/transactions')}>{t('View transactions')}</PrimaryButton>
          <SecondaryButton onPress={reset}>{t('New transfer')}</SecondaryButton>
        </View>
      ) : null}

      {type !== 'internal' ? (
        <View className="gap-2 pt-2">
          <Text size="lg" weight="semibold">{t('Recent transfer requests')}</Text>
          {history.data?.length ? history.data.slice(0, 5).map((item: any) => (
            <Card className="gap-0.5 p-3" key={item.id}>
              <View className="flex-row justify-between">
                <Text size="sm" muted>{t(item.transferType === 'sepa' ? 'SEPA Transfer' : 'SWIFT Transfer')}</Text>
                <Text size="sm" muted>{t(item.status === 'pending' ? 'Pending review' : item.status)}</Text>
              </View>
              <Text weight="semibold">{formatMoney(item.amountMinor, item.currency)}</Text>
              <Text size="sm">{item.beneficiaryName}</Text>
            </Card>
          )) : history.loading ? null : <Empty icon="swap-horizontal-outline" title="No transfer requests yet." />}
        </View>
      ) : null}
    </Screen>
  );
}
