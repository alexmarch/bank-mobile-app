import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { usePreferences } from '../../../src/preferences/PreferencesProvider';

export default function MoreLayout() {
  const { t } = usePreferences();
  const router = useRouter();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('More'),
          headerLeft: () => (
            <Pressable accessibilityLabel={t('Home')} hitSlop={12} onPress={() => router.navigate('/')}>
              <Ionicons name="chevron-back" size={26} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="loans" options={{ title: t('Loans') }} />
      <Stack.Screen name="investments" options={{ title: t('Investments') }} />
    </Stack>
  );
}
