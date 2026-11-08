import { useRouter } from 'expo-router';
import AuthLayout from '../components/AuthLayout';
import AuthTopBar from '../components/AuthTopBar';
import RegistrationForm from '../components/RegistrationForm';
import { usePreferences } from '../preferences/PreferencesProvider';

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = usePreferences();

  return (
    <AuthLayout
      header={<AuthTopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} title={t('Open an account')} />}
    >
      <RegistrationForm />
    </AuthLayout>
  );
}
