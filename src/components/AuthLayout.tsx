import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Spinner } from 'panelui-native';
import { useAuth } from '../auth/AuthProvider';
import { usePreferences } from '../preferences/PreferencesProvider';
import SignInFooter, { ConnectionNote } from './SignInFooter';

type Props = {
  header: ReactNode;
  children: ReactNode;
};

export default function AuthLayout({ header, children }: Props) {
  const { restoring } = useAuth();
  const { mode, ready } = usePreferences();

  if (restoring || !ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerClassName="items-center gap-5 px-6 pb-2 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          {children}
          <ConnectionNote />
          <SignInFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
