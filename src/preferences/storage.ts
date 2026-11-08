import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function getPreference(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setPreference(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value) globalThis.localStorage?.setItem(key, value);
    else globalThis.localStorage?.removeItem(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}
