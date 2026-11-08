import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Alert, Avatar, Label, OtpInput, QRCode, Select, Switch, Tabs, Text } from 'panelui-native';
import FaceScanIcon from '../../assets/signin/face-scan.svg';
import ArrowRightIcon from '../../assets/signin/arrow-right-face.svg';
import CloseIcon from '../../assets/signin/close.svg';
import { useAuth } from '../auth/AuthProvider';
import { api, assetUrl } from '../api/client';
import { useApi } from '../api/useApi';
import { PasswordField, PrimaryButton, SecondaryButton, TextField } from '../components/fields';
import DateField from '../components/DateField';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

const CURRENCIES = ['USD', 'EUR', 'TRY', 'RUB'];
const TIME_ZONES = ['UTC', 'Europe/Paris', 'Europe/Istanbul', 'Europe/Moscow'];
const NOTIFICATIONS = [
  { name: 'digitalCurrency', label: 'I send or receive digital currency' },
  { name: 'merchantOrder', label: 'I receive merchant order' },
  { name: 'recommendations', label: 'There are recommendations for my account' },
];

type Notice = { kind: 'success' | 'destructive'; text: string } | null;

function NoticeAlert({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <Alert variant={notice.kind}><Alert.Content><Alert.Description>{notice.text}</Alert.Description></Alert.Content></Alert>;
}

async function run(action: () => Promise<unknown>, setNotice: (n: Notice) => void, success: string) {
  try {
    await action();
    setNotice({ kind: 'success', text: success });
    return true;
  } catch (error) {
    setNotice({ kind: 'destructive', text: error instanceof Error ? error.message : 'Request failed' });
    return false;
  }
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function AvatarEditor({ name, avatarUrl, onChanged, onError }: {
  name: string;
  avatarUrl?: string | null;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false);
  const src = assetUrl(avatarUrl);

  const change = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Request failed');
    }
    setBusy(false);
  };

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) return onError('The file is larger than 2 MB');
    await change(async () => {
      const blob = await (await fetch(asset.uri)).blob();
      return api.upload('/me/avatar', blob.type ? blob : new Blob([blob], { type: asset.mimeType ?? 'image/jpeg' }));
    });
  };

  return (
    <View className="items-center gap-3">
      <View>
        <Avatar fallback={name.trim().charAt(0).toUpperCase() || '?'} size="xl" source={src ? { uri: src } : undefined} />
        <Pressable
          accessibilityLabel={t('Edit profile photo')}
          className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary"
          disabled={busy}
          onPress={choose}
        >
          <Ionicons color="#ffffff" name="pencil" size={16} />
        </Pressable>
      </View>
      {src ? (
        <Pressable disabled={busy} onPress={() => void change(() => api.delete('/me/avatar'))}>
          <Text className="text-destructive" size="sm" weight="medium">{t('Remove photo')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileTab({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const { t } = usePreferences();
  const [form, setForm] = useState({
    name: `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    birthDate: profile.birthDate ?? '',
    streetAddress: profile.streetAddress ?? '',
    permanentAddress: profile.permanentAddress ?? '',
    city: profile.city ?? '',
    postalCode: profile.postalCode ?? '',
    country: profile.country ?? '',
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const set = (name: string) => (value: string) => setForm((current) => ({ ...current, [name]: value }));

  const save = async () => {
    setBusy(true);
    const [firstName, ...rest] = form.name.trim().split(/\s+/);
    const { name, ...others } = form;
    const values = { ...others, firstName, lastName: rest.join(' ') || profile.lastName };
    if (await run(() => api.patch('/me/profile', values), setNotice, t('Changes saved'))) onSaved();
    setBusy(false);
  };

  return (
    <View className="gap-4">
      <AvatarEditor
        avatarUrl={profile.avatarUrl}
        name={form.name}
        onChanged={onSaved}
        onError={(text) => setNotice({ kind: 'destructive', text: t(text) })}
      />
      <TextField label={t('Your Name')} onChangeText={set('name')} value={form.name} />
      <TextField keyboardType="phone-pad" label={t('Phone')} onChangeText={set('phone')} value={form.phone} />
      <TextField autoCapitalize="none" keyboardType="email-address" label={t('Email')} onChangeText={set('email')} value={form.email} />
      <DateField label={t('Date of Birth')} onChange={set('birthDate')} value={form.birthDate} />
      <TextField label={t('Present Address')} onChangeText={set('streetAddress')} value={form.streetAddress} />
      <TextField label={t('Permanent Address')} onChangeText={set('permanentAddress')} value={form.permanentAddress} />
      <TextField label={t('City')} onChangeText={set('city')} value={form.city} />
      <TextField label={t('Postal Code')} onChangeText={set('postalCode')} value={form.postalCode} />
      <TextField label={t('Country')} onChangeText={set('country')} value={form.country} />
      <NoticeAlert notice={notice} />
      <PrimaryButton loading={busy} onPress={save}>{t('Save')}</PrimaryButton>
    </View>
  );
}

function PreferencesTab({ preferences, onSaved }: { preferences: any; onSaved: () => void }) {
  const { t } = usePreferences();
  const [form, setForm] = useState(preferences);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const withCurrent = (list: string[], value: string) => (list.includes(value) ? list : [value, ...list]);

  const save = async () => {
    setBusy(true);
    if (await run(() => api.patch('/me/preferences', form), setNotice, t('Changes saved'))) onSaved();
    setBusy(false);
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Label>{t('Currency')}</Label>
        <Select onValueChange={(value) => setForm({ ...form, currency: value })} presentation="overlay" title={t('Currency')} value={form.currency}>
          {withCurrent(CURRENCIES, form.currency).map((item) => <Select.Item key={item} label={item} value={item} />)}
        </Select>
      </View>
      <View className="gap-2">
        <Label>{t('Time Zone')}</Label>
        <Select onValueChange={(value) => setForm({ ...form, timeZone: value })} presentation="overlay" title={t('Time Zone')} value={form.timeZone}>
          {withCurrent(TIME_ZONES, form.timeZone).map((item) => <Select.Item key={item} label={item} value={item} />)}
        </Select>
      </View>
      {NOTIFICATIONS.map((option) => (
        <View className="flex-row items-center justify-between gap-3" key={option.name}>
          <Text className="flex-1" size="sm">{t(option.label)}</Text>
          <Switch
            accessibilityLabel={t(option.label)}
            onValueChange={(value) => setForm({ ...form, notifications: { ...form.notifications, [option.name]: value } })}
            value={Boolean(form.notifications?.[option.name])}
          />
        </View>
      ))}
      <NoticeAlert notice={notice} />
      <PrimaryButton loading={busy} onPress={save}>{t('Save')}</PrimaryButton>
    </View>
  );
}

function TwoFactor({ enabled, onChanged }: { enabled: boolean; onChanged: () => void }) {
  const { t } = usePreferences();
  const [step, setStep] = useState<null | 'enable' | 'disable'>(null);
  const [setup, setSetup] = useState<any>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const reset = () => { setStep(null); setSetup(null); setCode(''); setPassword(''); };

  const begin = async () => {
    setBusy(true);
    try {
      setSetup(await api.post('/me/2fa/setup'));
      setStep('enable');
      setNotice(null);
    } catch (error) {
      setNotice({ kind: 'destructive', text: error instanceof Error ? error.message : 'Request failed' });
    }
    setBusy(false);
  };

  const confirm = async () => {
    setBusy(true);
    const ok = step === 'enable'
      ? await run(() => api.post('/me/2fa/enable', { setupToken: setup.setupToken, code }), setNotice, t('Two-factor authentication enabled'))
      : await run(() => api.post('/me/2fa/disable', { password, code }), setNotice, t('Two-factor authentication disabled'));
    if (ok) { reset(); onChanged(); }
    setBusy(false);
  };

  return (
    <View className="gap-3">
      <Text size="lg" weight="semibold">{t('Two-factor authentication')}</Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1" size="sm" muted>
          {enabled ? t('Two-factor authentication is on') : t('Two-factor authentication is off')}
        </Text>
        <Switch
          accessibilityLabel={t('Two-factor authentication')}
          disabled={busy}
          onValueChange={(next) => (next ? void begin() : setStep(step === 'disable' ? null : 'disable'))}
          value={enabled || step === 'enable'}
        />
      </View>
      {step === 'enable' && setup ? (
        <View className="items-center gap-3">
          <Text className="text-center" size="sm" muted>
            {t('Scan the QR code with your authenticator app, then enter the 6-digit code.')}
          </Text>
          <QRCode errorCorrection="M" size="lg" value={setup.uri}>
            <QRCode.Canvas />
          </QRCode>
          <Text size="sm" muted>{t('Or enter this key manually:')}</Text>
          <Text selectable size="sm" weight="semibold">{setup.secret}</Text>
        </View>
      ) : null}
      {step === 'disable' ? (
        <PasswordField label={t('Current Password')} onChangeText={setPassword} value={password} />
      ) : null}
      {step ? (
        <View className="gap-3">
          <OtpInput length={6} onChangeText={setCode} type="numeric" value={code} />
          <View className="flex-row gap-3">
            <SecondaryButton className="flex-1" onPress={reset}>{t('Cancel')}</SecondaryButton>
            <PrimaryButton className="flex-1" disabled={code.length !== 6 || (step === 'disable' && !password)} loading={busy} onPress={confirm}>
              {t(step === 'enable' ? 'Enable' : 'Disable')}
            </PrimaryButton>
          </View>
        </View>
      ) : null}
      <NoticeAlert notice={notice} />
    </View>
  );
}

function PasswordChange() {
  const { t } = usePreferences();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const change = async () => {
    setBusy(true);
    const ok = await run(
      () => api.post('/me/password', { currentPassword: current, newPassword: next, refreshToken: api.currentRefreshToken() }),
      setNotice,
      t('Password changed'),
    );
    if (ok) { setCurrent(''); setNext(''); }
    setBusy(false);
  };

  return (
    <View className="gap-3">
      <Text size="lg" weight="semibold">{t('Change Password')}</Text>
      <PasswordField autoComplete="current-password" label={t('Current Password')} onChangeText={setCurrent} value={current} />
      <PasswordField autoComplete="new-password" label={t('New Password')} onChangeText={setNext} value={next} />
      <NoticeAlert notice={notice} />
      <PrimaryButton disabled={!current || !next} loading={busy} onPress={change}>{t('Change Password')}</PrimaryButton>
    </View>
  );
}

function BiometricSignIn() {
  const { t, mode } = usePreferences();
  const { biometricEnabled, disableBiometricSignIn, enableBiometricSignIn } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  if (Platform.OS === 'web' || dismissed) return null;

  const faceId = Platform.OS === 'ios';
  const title = biometricEnabled
    ? t(faceId ? 'Face ID is enabled' : 'Biometric sign-in is enabled')
    : t(faceId ? 'Face ID is not enabled' : 'Biometric sign-in is not enabled');
  const description = biometricEnabled
    ? t(faceId ? 'Use Face ID to sign in securely.' : 'Use biometrics or your device passcode to sign in securely.')
    : t(faceId
      ? 'Enable Face ID for quick and secure sign-in.'
      : 'Enable biometric sign-in for quick and secure access.');

  const toggle = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (biometricEnabled) await disableBiometricSignIn();
      else if (await enableBiometricSignIn()) setNotice({ kind: 'success', text: t('Biometric sign-in enabled') });
    } catch (error) {
      setNotice({ kind: 'destructive', text: error instanceof Error ? t(error.message) : t('Could not update biometric sign-in.') });
    } finally {
      setBusy(false);
    }
  };

  const foreground = mode === 'dark' ? '#e8ecff' : '#343c6a';
  const secondary = mode === 'dark' ? '#a7b6d5' : '#718ebf';

  return (
    <View className="gap-3">
      <View
        className="flex-row items-center gap-[14px] rounded-[20px] p-4"
        style={{
          backgroundColor: mode === 'dark' ? '#0f1729' : '#ffffff',
          elevation: 3,
          shadowColor: '#e7e4e8',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 0.8,
          shadowRadius: 9,
        }}
      >
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#eef3ff]">
          <FaceScanIcon />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text style={{ color: foreground, fontSize: 18, lineHeight: 22 }} weight="medium">{title}</Text>
          <Text style={{ color: secondary, fontSize: 13, lineHeight: 17 }}>{description}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void toggle()}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, opacity: busy ? 0.6 : 1 }}
          >
            <Text style={{ color: '#2d60ff', fontSize: 15, lineHeight: 20 }} weight="medium">
              {t(biometricEnabled ? 'Disable' : 'Enable')}
            </Text>
            {!biometricEnabled ? <ArrowRightIcon /> : null}
          </Pressable>
        </View>
        {!biometricEnabled ? (
          <Pressable
            accessibilityLabel={t('Dismiss')}
            accessibilityRole="button"
            className="h-7 w-7 shrink-0 items-center justify-center rounded-[14px] bg-[#f5f7fa]"
            onPress={() => setDismissed(true)}
          >
            <CloseIcon />
          </Pressable>
        ) : null}
      </View>
      <NoticeAlert notice={notice} />
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = usePreferences();
  const { top } = useSafeAreaInsets();
  const { data, error, loading, reload } = useApi('/me/settings');
  const [tab, setTab] = useState('profile');
  const [version, setVersion] = useState(0);
  useEffect(() => { if (data) setVersion((value) => value + 1); }, [data?.profile?.firstName]);

  return (
    <Screen icon="settings-outline" error={error} loading={loading && !data} title={t('Settings')} topPadding={top + 44}>
      <Stack.Screen options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, title: t('Settings') }} />
      {data ? (
        <>
          <Tabs defaultValue="profile" onValueChange={setTab} value={tab} variant="segmented">
            <Tabs.List>
              <Tabs.Trigger value="profile">{t('Edit Profile')}</Tabs.Trigger>
              <Tabs.Trigger value="preferences">{t('Preference')}</Tabs.Trigger>
              <Tabs.Trigger value="security">{t('Security')}</Tabs.Trigger>
            </Tabs.List>
          </Tabs>
          {tab === 'profile' ? <ProfileTab key={version} onSaved={() => void reload(true)} profile={data.profile} /> : null}
          {tab === 'preferences' ? <PreferencesTab key={version} onSaved={() => void reload(true)} preferences={data.preferences} /> : null}
          {tab === 'security' ? (
            <View className="gap-8">
              <BiometricSignIn />
              <TwoFactor enabled={data.security.twoFactorEnabled} onChanged={() => void reload(true)} />
              <PasswordChange />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
