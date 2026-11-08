import { Linking, View } from 'react-native';
import { LockIcon, Separator, Text } from 'panelui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../brand/BrandProvider';
import { usePreferences } from '../preferences/PreferencesProvider';

export function ConnectionNote() {
  const { t } = usePreferences();
  return (
    <View className="flex-row items-center justify-center gap-2 px-6">
      <LockIcon size={16} />
      <Text size="sm" muted>{t('Your connection is secure and encrypted')}</Text>
    </View>
  );
}

export default function SignInFooter() {
  const { t } = usePreferences();
  const { bottom } = useSafeAreaInsets();
  const brand = useBrand();
  return (
    <View className="w-full items-center gap-3 pt-2" style={{ paddingBottom: bottom + 12 }}>
      <Separator />
      {brand.privacyUrl || brand.termsUrl ? (
        <View className="flex-row flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {brand.privacyUrl ? <Text onPress={() => void Linking.openURL(brand.privacyUrl!)} size="sm" muted>{t('Privacy Policy')}</Text> : null}
          {brand.termsUrl ? <Text onPress={() => void Linking.openURL(brand.termsUrl!)} size="sm" muted>{t('Terms of Use')}</Text> : null}
        </View>
      ) : null}
      <Text size="xs" muted>{brand.footerText || t('© 2026 BankDash. All rights reserved.').replace('BankDash', brand.name)}</Text>
    </View>
  );
}
