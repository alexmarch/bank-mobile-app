import '../global.css';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PanelUIProvider } from 'panelui-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { EmptyState } from 'panelui-native';
import { BrandProvider, useBrand } from '../src/brand/BrandProvider';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { CallProvider } from '../src/calls/CallProvider';
import { PushRegistration } from '../src/push/PushRegistration';
import { SupportChatProvider } from '../src/support/SupportChatProvider';
import { PreferencesProvider, usePreferences } from '../src/preferences/PreferencesProvider';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

// Keeps the branded splash up until preferences and the saved session are restored.
function SplashGate() {
  const { ready } = usePreferences();
  const { restoring } = useAuth();

  useEffect(() => {
    if (ready && !restoring) void SplashScreen.hideAsync();
  }, [ready, restoring]);

  return null;
}

// Customers see the maintenance screen on every page, as in the portal.
function MaintenanceGate() {
  const { maintenance } = useBrand();
  const { t } = usePreferences();
  if (!maintenance) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-background p-6">
      <EmptyState>
        <EmptyState.Title>{t('The bank is under maintenance. Please try again later')}</EmptyState.Title>
      </EmptyState>
    </View>
  );
}

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: 'transparent' } } as const;

// The single place that moves the user between the sign-in and signed-in areas.
function RootStack() {
  const { session, restoring } = useAuth();
  const router = useRouter();
  const signedIn = Boolean(session);

  // "/" belongs to the signed-in Home, so the sign-in screen has its own path.
  const area = useSegments()[0];
  const inAuthArea = area === 'sign-in' || area === 'signup';
  useEffect(() => {
    if (restoring) return;
    if (signedIn && inAuthArea) router.replace('/(app)');
    else if (!signedIn && !inAuthArea) router.replace('/sign-in');
  }, [signedIn, inAuthArea, restoring, router]);

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="transfer/internal" />
      <Stack.Screen name="transfer/swift" />
      <Stack.Screen name="transfer/sepa" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="account-application" />
      <Stack.Screen name="card-application" />
      <Stack.Screen name="card-details" />
      <Stack.Screen name="crypto-deposit" />
      <Stack.Screen name="support-chat" />
      <Stack.Screen name="call" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBlack: Inter_900Black,
  });

  return (
    <SafeAreaProvider>
      <PanelUIProvider>
        {!fontsLoaded ? null : (
          <PreferencesProvider>
            <BrandProvider>
            <AuthProvider>
              <SupportChatProvider>
                <CallProvider>
                <PushRegistration />
                <SplashGate />
                <StatusBar style="auto" />
                <RootStack />
                <MaintenanceGate />
                </CallProvider>
              </SupportChatProvider>
            </AuthProvider>
            </BrandProvider>
          </PreferencesProvider>
        )}
      </PanelUIProvider>
    </SafeAreaProvider>
  );
}
