import { useState, type ComponentProps } from 'react';
import RememberMe from './RememberMe';
import { Keyboard, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, ChevronRightIcon, GoogleIcon, Input, Separator, ShieldCheckIcon, Text } from 'panelui-native';
import { useBrand } from '../brand/BrandProvider';
import { useAuth } from '../auth/AuthProvider';
import { usePreferences } from '../preferences/PreferencesProvider';
import DateField from './DateField';
import { PasswordField, PrimaryButton } from './fields';

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
};

type FieldName = keyof Fields;
type FieldErrors = Partial<Record<FieldName | 'consent', string>>;

const initialFields: Fields = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  password: '',
  confirmPassword: '',
};

function isAdult(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date.getUTCFullYear() < 1900
  ) return false;
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  return date <= cutoff;
}

export default function RegistrationForm() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = usePreferences();
  const brand = useBrand();
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (name: FieldName, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setRequestError('');
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!fields.firstName.trim()) nextErrors.firstName = t('Enter your first name');
    if (!fields.lastName.trim()) nextErrors.lastName = t('Enter your last name');
    if (!/^\S+@\S+\.\S+$/.test(fields.email.trim())) nextErrors.email = t('Enter a valid email address.');
    if (!fields.phone.trim()) nextErrors.phone = t('Enter your phone number');
    else if (fields.phone.trim().length > 32) nextErrors.phone = t('Enter a valid phone number.');
    if (!isAdult(fields.birthDate)) nextErrors.birthDate = t('You must be 18 or older.');
    if (
      fields.password.length < 8 ||
      fields.password.length > 128 ||
      !/[A-Za-z]/.test(fields.password) ||
      !/\d/.test(fields.password) ||
      !/[^A-Za-z0-9]/.test(fields.password)
    ) {
      nextErrors.password = t('Password must include a letter, a number and a symbol.');
    }
    if (fields.confirmPassword !== fields.password) nextErrors.confirmPassword = t('Passwords do not match.');
    if (!termsAccepted) nextErrors.consent = t('Please confirm your age and accept the terms.');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    Keyboard.dismiss();
    setRequestError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        email: fields.email.trim(),
        password: fields.password,
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        phone: fields.phone.trim(),
        birthDate: fields.birthDate,
      });
    } catch (error) {
      setRequestError(error instanceof Error ? t(error.message) : t('Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    name: FieldName,
    label: string,
    placeholder: string,
    props: Partial<ComponentProps<typeof Input>> = {},
  ) => (
    <Input
      autoCapitalize={name === 'firstName' || name === 'lastName' ? 'words' : 'none'}
      autoCorrect={false}
      errorMessage={errors[name]}
      isRequired
      label={t(label)}
      onChangeText={(value) => updateField(name, value)}
      placeholder={t(placeholder)}
      value={fields[name]}
      {...props}
    />
  );

  const renderPasswordInput = (name: 'password' | 'confirmPassword', label: string, placeholder: string) => (
    <PasswordField
      autoComplete="new-password"
      errorMessage={errors[name]}
      label={t(label)}
      maxLength={128}
      onChangeText={(value) => updateField(name, value)}
      placeholder={t(placeholder)}
      textContentType="newPassword"
      value={fields[name]}
    />
  );

  return (
    <Card className="w-full">
      <Card.Header className="gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <ShieldCheckIcon size={24} />
        </View>
        <Card.Title>{t('Open an account')}</Card.Title>
        <Card.Description>{t('A few details to start your journey with BankDash.')}</Card.Description>
      </Card.Header>

      <Card.Content className="gap-4">
        {renderInput('firstName', 'First Name', 'Enter your first name', {
          autoComplete: 'given-name',
          maxLength: 100,
          textContentType: 'givenName',
        })}
        {renderInput('lastName', 'Last Name', 'Enter your last name', {
          autoComplete: 'family-name',
          maxLength: 100,
          textContentType: 'familyName',
        })}
        {renderInput('email', 'Email Address', 'Enter your email address', {
          autoComplete: 'email',
          keyboardType: 'email-address',
          textContentType: 'emailAddress',
        })}
        {renderInput('phone', 'Phone Number', 'Enter your phone number', {
          autoComplete: 'tel',
          keyboardType: 'phone-pad',
          maxLength: 32,
          textContentType: 'telephoneNumber',
        })}
        <DateField
          error={errors.birthDate}
          label={t('Date of Birth')}
          onChange={(value) => updateField('birthDate', value)}
          value={fields.birthDate}
        />
        {renderPasswordInput('password', 'Password', 'Create a password')}
        {renderPasswordInput('confirmPassword', 'Confirm Password', 'Re-enter your password')}
        <Text size="sm" muted>{t('Use 8 or more characters with a letter, a number and a symbol.')}</Text>
        {requestError ? (
          <Text accessibilityLiveRegion="polite" size="sm" className="text-destructive">{requestError}</Text>
        ) : null}

        <RememberMe
          checked={termsAccepted}
          label={(
            <Text size="sm">
              {brand.termsUrl || brand.privacyUrl ? t('I am 18 or older and agree to the') : t('I am 18 or older')}{' '}
              {brand.termsUrl ? <Text className="text-primary" onPress={() => void Linking.openURL(brand.termsUrl!)} size="sm">{t('Terms of Use')}</Text> : null}
              {brand.termsUrl && brand.privacyUrl ? ` ${t('and')} ` : null}
              {brand.privacyUrl ? <Text className="text-primary" onPress={() => void Linking.openURL(brand.privacyUrl!)} size="sm">{t('Privacy Policy')}</Text> : null}
              {brand.termsUrl || brand.privacyUrl ? '.' : ''}
            </Text>
          )}
          onChange={(checked) => {
            setTermsAccepted(checked);
            setErrors((current) => ({ ...current, consent: undefined }));
          }}
        />
        {errors.consent ? <Text size="sm" className="text-destructive">{errors.consent}</Text> : null}
      </Card.Content>

      <Card.Footer className="flex-col items-stretch gap-4">
        <PrimaryButton
          accessibilityLabel={t('Open an account')}
          endContent={<ChevronRightIcon size={18} />}
          fullWidth
          loading={loading}
          onPress={submit}
        >
          {t('Open an account')}
        </PrimaryButton>
        {brand.googleLogin ? (
          <>
            <Separator>{t('or')}</Separator>
            <Button
              accessibilityLabel={t('Sign up with Google')}
              disabled
              fullWidth
              size="lg"
              startContent={<GoogleIcon size={18} />}
              variant="social"
            >
              {t('Sign up with Google')}
            </Button>
          </>
        ) : null}
        <View className="flex-row items-center justify-center gap-1">
          <Text size="sm" muted>{t('Already have an account?')}</Text>
          <Button
            labelClassName="text-primary"
            onPress={() => {
              Keyboard.dismiss();
              router.replace('/sign-in');
            }}
            size="sm"
            variant="ghost"
          >
            {t('Sign In')}
          </Button>
        </View>
      </Card.Footer>
    </Card>
  );
}
