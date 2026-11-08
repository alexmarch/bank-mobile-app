import AuthLayout from '../components/AuthLayout';
import SignInForm from '../components/SignInForm';
import SignInHeader from '../components/SignInHeader';

export default function SignInScreen() {
  return (
    <AuthLayout header={<SignInHeader />}>
      <SignInForm />
    </AuthLayout>
  );
}
