import { useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert, Button, Card, ChevronRightIcon, Input, Label, OtpInput, ShieldCheckIcon, Text } from 'panelui-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useBrand } from '../brand/BrandProvider';
import { useAuth } from '../auth/AuthProvider';
import { usePreferences } from '../preferences/PreferencesProvider';
import RememberMe from './RememberMe';
import { PasswordField, PrimaryButton } from './fields';

export default function SignInForm() {
  const router = useRouter();
  const { signIn, restoreError, biometricEnabled, unlockWithBiometrics } = useAuth();
  const { t } = usePreferences();
  const brand = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState(restoreError);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const signInWithBiometrics = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      await unlockWithBiometrics();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? t(unlockError.message) : t('Sign in failed. Please try again.'));
    } finally {
      setBiometricLoading(false);
    }
  };

  const submit = async () => {
    Keyboard.dismiss();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('Enter a valid email address.'));
      return;
    }
    if (!password) return;
    if (needsTotp && totpCode.length !== 6) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password, needsTotp ? totpCode : undefined, remember);
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message : t('Sign in failed. Please try again.');
      if (message === 'TOTP code required') {
        setNeedsTotp(true);
        setError(t('Enter the 6-digit code from your authenticator app.'));
      } else {
        setError(t(message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <Card.Header className="gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <ShieldCheckIcon size={24} />
        </View>
        <Card.Title>{t('Welcome back')}</Card.Title>
        <Card.Description>{t('Sign in to manage your money securely.')}</Card.Description>
      </Card.Header>

      <Card.Content className="gap-4">
        <Input
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          isRequired
          keyboardType="email-address"
          label={t('Email Address')}
          onChangeText={(value) => {
            setEmail(value);
            setError('');
          }}
          placeholder={t('Enter your email address')}
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
        <PasswordField
          autoComplete="current-password"
          label={t('Password')}
          onChangeText={(value) => {
            setPassword(value);
            setError('');
          }}
          onSubmitEditing={submit}
          placeholder={t('Enter your password')}
          returnKeyType="go"
          textContentType="password"
          value={password}
        />

        {needsTotp ? (
          <View className="gap-2">
            <Label>{t('Authentication code')}</Label>
            <OtpInput
              accessibilityLabel={t('Authentication code')}
              autoComplete="sms-otp"
              length={6}
              onChangeText={setTotpCode}
              textContentType="oneTimeCode"
              type="numeric"
              value={totpCode}
            />
          </View>
        ) : null}

        <View className="flex-row items-center">
          <RememberMe checked={remember} label={t('Remember me')} onChange={setRemember} />
        </View>

        {error ? (
          <Alert variant="destructive">
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>

      <Card.Footer className="flex-col items-stretch gap-3">
        {biometricEnabled ? (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-xl border border-border py-3"
            disabled={biometricLoading}
            onPress={() => void signInWithBiometrics()}
          >
            <Ionicons color="#2d60ff" name="scan-outline" size={20} />
            <Text className="text-primary" size="sm" weight="medium">
              {t(Platform.OS === 'ios' ? 'Sign in with Face ID' : 'Sign in with biometrics')}
            </Text>
          </Pressable>
        ) : null}
        <PrimaryButton
          accessibilityLabel={t('Sign In')}
          endContent={<ChevronRightIcon size={18} />}
          fullWidth
          loading={loading}
          onPress={submit}
        >
          {t('Sign In')}
        </PrimaryButton>
        <View className="flex-row items-center justify-center gap-1">
          <Text size="sm" muted>{t('New to BankDash?').replace('BankDash', brand.name)}</Text>
          <Button labelClassName="text-primary" onPress={() => router.push('/signup')} size="sm" variant="ghost">
            {t('Open an account')}
          </Button>
        </View>
      </Card.Footer>
    </Card>
  );
}
