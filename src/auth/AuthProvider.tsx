import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { unregisterPushToken } from '../push/PushRegistration';
import { createContext, useCallback, useRef, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { ApiError, configureApiSession, send as sendRequest } from '../api/client';
import { usePreferences } from '../preferences/PreferencesProvider';

export type User = {
  firstName?: string;
  lastName?: string;
  email: string;
};

export type Session = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type RegistrationDetails = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
};

const REFRESH_TOKEN_KEY = 'bankdash-refresh-token';
const BIOMETRIC_SIGN_IN_KEY = 'bankdash-biometric-sign-in';

async function readRefreshToken() {
  if (Platform.OS === 'web') return globalThis.sessionStorage?.getItem(REFRESH_TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function saveRefreshToken(value: string | null) {
  if (Platform.OS === 'web') {
    if (value) globalThis.sessionStorage?.setItem(REFRESH_TOKEN_KEY, value);
    else globalThis.sessionStorage?.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function readBiometricSignIn() {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(BIOMETRIC_SIGN_IN_KEY)) === 'true';
}

async function saveBiometricSignIn(enabled: boolean) {
  if (Platform.OS === 'web') return;
  if (enabled) await SecureStore.setItemAsync(BIOMETRIC_SIGN_IN_KEY, 'true');
  else await SecureStore.deleteItemAsync(BIOMETRIC_SIGN_IN_KEY);
}

function wasAuthenticationCancelled(result: LocalAuthentication.LocalAuthenticationResult) {
  return !result.success && ['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error);
}

const send = (path: string, body: unknown, accessToken?: string) => sendRequest(path, { method: 'POST', body }, accessToken);

type AuthContextValue = {
  session: Session | null;
  restoring: boolean;
  restoreError: string;
  biometricEnabled: boolean;
  signIn: (email: string, password: string, totpCode: string | undefined, remember: boolean) => Promise<void>;
  enableBiometricSignIn: () => Promise<boolean>;
  disableBiometricSignIn: () => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  register: (details: RegistrationDetails) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const remembered = useRef(false);
  const biometricEnabledRef = useRef(false);
  const translate = useRef(t);
  translate.current = t;
  const updateBiometricEnabled = useCallback((enabled: boolean) => {
    biometricEnabledRef.current = enabled;
    setBiometricEnabled(enabled);
  }, []);

  const activate = useCallback((next: Session | null, remember: boolean) => {
    remembered.current = remember;
    configureApiSession(next, (tokens) => {
      if (!tokens) {
        void saveRefreshToken(null);
        void saveBiometricSignIn(false);
        updateBiometricEnabled(false);
        setSession(null);
        return;
      }
      if (remembered.current || biometricEnabledRef.current) void saveRefreshToken(tokens.refreshToken);
      setSession((current) => (current ? { ...current, ...tokens } : current));
    });
    setSession(next);
  }, [updateBiometricEnabled]);

  useEffect(() => {
    let active = true;
    Promise.all([readRefreshToken(), readBiometricSignIn()])
      .then(async ([refreshToken, enabled]) => {
        if (active) updateBiometricEnabled(enabled);
        if (!refreshToken) return;
        if (enabled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: translate.current('Authenticate to sign in to BankDash'),
            cancelLabel: translate.current('Cancel'),
            disableDeviceFallback: false,
          });
          if (!result.success) {
            if (!wasAuthenticationCancelled(result) && active) {
              setRestoreError('Set up Face ID, fingerprint, or a device passcode in your device settings first.');
            }
            return;
          }
        }
        const restored = await send('/auth/refresh', { refreshToken }) as Session;
        if (active) {
          await saveRefreshToken(restored.refreshToken);
          activate(restored, true);
        }
      })
      .catch(async (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          await saveRefreshToken(null);
          await saveBiometricSignIn(false);
          if (active) updateBiometricEnabled(false);
        } else if (active) {
          setRestoreError('Could not restore your saved session. Check your connection and sign in again.');
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [activate, updateBiometricEnabled]);

  const signIn = useCallback(async (
    email: string,
    password: string,
    totpCode: string | undefined,
    remember: boolean,
  ) => {
    const payload: { email: string; password: string; totpCode?: string } = { email, password };
    if (totpCode) payload.totpCode = totpCode;
    const signedIn = await send('/auth/customer/login', payload) as Session;
    const shouldRemember = remember || biometricEnabled;
    await saveRefreshToken(shouldRemember ? signedIn.refreshToken : null);
    activate(signedIn, shouldRemember);
  }, [activate, biometricEnabled]);

  const enableBiometricSignIn = useCallback(async () => {
    if (Platform.OS === 'web' || !session) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('Enable biometric sign-in for BankDash'),
      cancelLabel: t('Cancel'),
      disableDeviceFallback: false,
    });
    if (!result.success) {
      if (wasAuthenticationCancelled(result)) return false;
      throw new Error(t('Set up Face ID, fingerprint, or a device passcode in your device settings first.'));
    }

    await saveRefreshToken(session.refreshToken);
    await saveBiometricSignIn(true);
    remembered.current = true;
    updateBiometricEnabled(true);
    return true;
  }, [session, t, updateBiometricEnabled]);

  const disableBiometricSignIn = useCallback(async () => {
    await saveBiometricSignIn(false);
    await saveRefreshToken(null);
    remembered.current = false;
    updateBiometricEnabled(false);
  }, [updateBiometricEnabled]);

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometricEnabled || Platform.OS === 'web') return;
    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      await saveBiometricSignIn(false);
      updateBiometricEnabled(false);
      throw new Error(t('Sign in with your email and password to set up biometric sign-in again.'));
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('Authenticate to sign in to BankDash'),
      cancelLabel: t('Cancel'),
      disableDeviceFallback: false,
    });
    if (!result.success) {
      if (wasAuthenticationCancelled(result)) return;
      throw new Error(t('Set up Face ID, fingerprint, or a device passcode in your device settings first.'));
    }
    try {
      const restored = await send('/auth/refresh', { refreshToken }) as Session;
      await saveRefreshToken(restored.refreshToken);
      activate(restored, true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await saveRefreshToken(null);
        await saveBiometricSignIn(false);
        updateBiometricEnabled(false);
      }
      throw error;
    }
  }, [activate, biometricEnabled, t, updateBiometricEnabled]);

  const register = useCallback(async (details: RegistrationDetails) => {
    const registered = await send('/auth/register', details) as Session;
    await saveRefreshToken(null);
    await saveBiometricSignIn(false);
    remembered.current = false;
    updateBiometricEnabled(false);
    activate(registered, false);
  }, [activate, updateBiometricEnabled]);

  const signOut = useCallback(async () => {
    const current = session;
    await unregisterPushToken();
    await saveRefreshToken(null);
    await saveBiometricSignIn(false);
    updateBiometricEnabled(false);
    remembered.current = false;
    configureApiSession(null, () => {});
    setSession(null);
    if (current) {
      // The local session is already gone; a failed revoke (expired token, offline) must not surface as an error.
      await send('/auth/logout', { refreshToken: current.refreshToken }, current.accessToken).catch(() => undefined);
    }
  }, [session, updateBiometricEnabled]);

  const value = useMemo(() => ({
    session,
    restoring,
    restoreError,
    biometricEnabled,
    signIn,
    enableBiometricSignIn,
    disableBiometricSignIn,
    unlockWithBiometrics,
    register,
    signOut,
  }), [
    biometricEnabled,
    disableBiometricSignIn,
    enableBiometricSignIn,
    restoreError,
    restoring,
    session,
    register,
    signIn,
    signOut,
    unlockWithBiometrics,
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
