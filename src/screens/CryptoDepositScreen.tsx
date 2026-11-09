import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Alert, Dialog, Label, Select, Text } from 'panelui-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { MoneyField, PrimaryButton, TextField } from '../components/fields';
import Screen from '../components/Screen';
import { parseMoneyToMinorUnits } from '../money';
import { usePreferences } from '../preferences/PreferencesProvider';

const STATUS_COLORS: Record<string, string> = { pending: '#d97706', approved: '#16a34a', completed: '#16a34a', rejected: '#dc2626', expired: '#718ebf' };

function formatUsd(minor: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(minor) / 100);
}

function timestampMillis(value: any) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) ? Number(value) : null;
  return numeric == null ? new Date(value).getTime() : numeric < 1e12 ? numeric * 1000 : numeric;
}

function useRemaining(expiresAt: any) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((timestampMillis(expiresAt) - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function CopyAddress({ value }: { value: string }) {
  const { locale, t } = usePreferences();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Pressable className="gap-2 rounded-2xl bg-accent p-3" onPress={copy}>
      <Text selectable size="sm" weight="medium">{value}</Text>
      <View className="flex-row items-center gap-1">
        <Ionicons color="#2d60ff" name={copied ? 'checkmark' : 'copy-outline'} size={16} />
        <Text className="text-primary" size="sm">{t(copied ? 'Copied' : 'Copy address')}</Text>
      </View>
    </Pressable>
  );
}

function PaymentRequest({ request, onClose }: { request: any; onClose: () => void }) {
  const { locale, t } = usePreferences();
  const remaining = useRemaining(request.expiresAt);
  const expired = remaining === '00:00';

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <Dialog.Content>
        <Dialog.Title>{t('Payment request')}</Dialog.Title>
        <Dialog.Description>{`${t('Time remaining')}: ${remaining}`}</Dialog.Description>
        <View className="items-center gap-3 py-2">
          {expired ? (
            <Alert variant="destructive">
              <Alert.Content><Alert.Description>{t('This payment request has expired. Submit a new request to continue.')}</Alert.Description></Alert.Content>
            </Alert>
          ) : (
            <View className="rounded-2xl bg-white p-3">
              <QRCode backgroundColor="#ffffff" color="#000000" size={196} value={request.walletAddress} />
            </View>
          )}
          <Text size="sm" muted>{t('Amount')}</Text>
          <Text size="2xl" weight="bold">{formatUsd(request.amountUsdMinor, locale)}</Text>
          <Text size="sm" muted>{`${request.asset} · ${request.network}`}</Text>
          <View className="self-stretch gap-1">
            <Text size="xs" muted>{t('Wallet address')}</Text>
            <CopyAddress value={request.walletAddress} />
          </View>
          <Text size="xs" muted>
            {t('Send only the selected asset through the selected network. The amount is a USD reference; confirm the deposit manually with the administrator.')}
          </Text>
        </View>
        <Dialog.Footer>
          <PrimaryButton onPress={onClose}>{t('Close')}</PrimaryButton>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

export default function CryptoDepositScreen() {
  const { locale, t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const addresses = useApi<any[]>('/me/crypto-deposits/addresses');
  const requests = useApi<any[]>('/me/crypto-deposits/requests');
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const wallets = addresses.data ?? [];
  const selected = useMemo(() => wallets.find((wallet) => String(wallet.id) === walletId) ?? wallets[0], [walletId, wallets]);

  const submit = async () => {
    const amountUsdMinor = parseMoneyToMinorUnits(amount, locale);
    if (amountUsdMinor == null || amountUsdMinor <= 0) {
      setError(t('Enter a valid amount in USD with up to two decimal places.'));
      return;
    }
    if (!selected) {
      setError(t('No active crypto deposit wallet is available.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const request = await api.post('/me/crypto-deposits/requests', {
        addressId: selected.id,
        amountUsdMinor,
        notes: notes.trim(),
      });
      setPayment(request);
      setAmount('');
      setNotes('');
      void requests.reload(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    }
    setBusy(false);
  };

  const reload = () => {
    void addresses.refresh();
    void requests.refresh();
  };

  return (
    <Screen
      icon="wallet-outline"
      error={addresses.error || requests.error}
      loading={addresses.loading && !addresses.data}
      onRefresh={reload}
      refreshing={addresses.refreshing}
      title={t('Crypto Deposit')}
      topPadding={top + 44}
    >
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Crypto Deposit') }} />
      <Text size="sm" muted>{t('Send funds to your configured personal wallet and receive USD credit on your bank account')}</Text>
      {error ? <Alert variant="destructive"><Alert.Content><Alert.Description>{t(error)}</Alert.Description></Alert.Content></Alert> : null}
      {addresses.data ? (
        <View className="gap-4 rounded-3xl bg-card p-5">
          <View>
            <Text size="lg" weight="semibold">{t('Personal Wallet Deposit')}</Text>
            <Text size="sm" muted>{t('Add funds from your crypto wallet to the USD balance')}</Text>
          </View>
          {wallets.length === 0 ? (
            <Alert>
              <Alert.Content><Alert.Description>{t('No personal crypto wallets have been configured for your account. Contact support.')}</Alert.Description></Alert.Content>
            </Alert>
          ) : (
            <>
              <Text weight="semibold">{t('Saved personal wallets')}</Text>
              {wallets.map((wallet) => {
                const active = String(wallet.id) === String(selected?.id);
                return (
                  <Pressable
                    className={`gap-1 rounded-2xl border-2 p-3 ${active ? 'border-primary' : 'border-border'}`}
                    key={wallet.id}
                    onPress={() => setWalletId(String(wallet.id))}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text weight="semibold">{wallet.asset}</Text>
                      <Text className="text-primary" size="xs" weight="medium">{`${wallet.network} / ${wallet.asset}`}</Text>
                    </View>
                    <Text selectable size="xs" muted>{wallet.address}</Text>
                  </Pressable>
                );
              })}
              <View className="gap-2">
                <Label>{t('Wallet address')}</Label>
                <Select onValueChange={setWalletId} presentation="overlay" title={t('Wallet address')} value={selected ? String(selected.id) : ''}>
                  {wallets.map((wallet) => (
                    <Select.Item key={wallet.id} label={`${wallet.asset} (${wallet.network})`} value={String(wallet.id)} />
                  ))}
                </Select>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2"><Label>{t('Currency')}</Label><TextField editable={false} value={selected?.asset ?? ''} /></View>
                <View className="flex-1 gap-2"><Label>{t('Network')}</Label><TextField editable={false} value={selected?.network ?? ''} /></View>
              </View>
              <View className="gap-2">
                <Label>{t('Amount in USD')}</Label>
                <MoneyField inputMode="decimal" keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" value={amount} />
              </View>
              <View className="gap-2">
                <Label>{t('Notes')}</Label>
                <TextField multiline numberOfLines={3} onChangeText={setNotes} placeholder={t('Optional comment for manager')} value={notes} />
              </View>
              <PrimaryButton loading={busy} onPress={submit}>{t(busy ? 'Submitting…' : 'Request crypto deposit')}</PrimaryButton>
            </>
          )}
        </View>
      ) : null}
      {requests.data?.length ? (
        <View className="gap-3 rounded-3xl bg-card p-5">
          <Text size="lg" weight="semibold">{t('Your crypto deposit requests')}</Text>
          {requests.data.map((request) => {
            const active = request.status === 'pending' && timestampMillis(request.expiresAt) > Date.now();
            return (
              <View className="gap-1" key={request.id}>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text weight="semibold">{formatUsd(request.amountUsdMinor, locale)}</Text>
                    <Text size="xs" muted>{`${request.asset} · ${request.network} · ${new Date(timestampMillis(request.createdAt)).toLocaleString()}`}</Text>
                  </View>
                  <Text size="sm" style={{ color: STATUS_COLORS[request.status] ?? '#718ebf' }} weight="semibold">{t(request.status)}</Text>
                </View>
                {active ? <Text className="text-primary" onPress={() => setPayment(request)} size="sm" weight="medium">{t('Show payment QR')}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {payment ? <PaymentRequest onClose={() => setPayment(null)} request={payment} /> : null}
    </Screen>
  );
}
