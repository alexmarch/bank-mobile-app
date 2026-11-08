import { Platform } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useBrandColor } from '../../src/brand/BrandProvider';
import { usePreferences } from '../../src/preferences/PreferencesProvider';

const tabs = [
  { name: 'index', label: 'Home', icon: 'home-outline', sf: 'house' },
  { name: 'accounts', label: 'Accounts', icon: 'wallet-outline', sf: 'creditcard' },
  { name: 'cards', label: 'Cards', icon: 'card-outline', sf: 'rectangle.on.rectangle' },
  { name: 'transactions', label: 'Transactions', icon: 'receipt-outline', sf: 'list.bullet.rectangle' },
  { name: 'more', label: 'More', icon: 'menu-outline', sf: 'ellipsis.circle' },
] as const;

export default function AuthenticatedTabs() {
  const { t, mode } = usePreferences();
  const dark = mode === 'dark';
  const primary = useBrandColor();
  const hideTabs = usePathname().startsWith('/more');
  return (
    <NativeTabs
      hidden={hideTabs}
      iconColor={{ default: dark ? '#93a4c4' : '#60779e', selected: primary }}
      labelStyle={{ default: { color: dark ? '#93a4c4' : '#60779e' }, selected: { color: primary } }}
      tintColor={primary}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.label)}</NativeTabs.Trigger.Label>
          {/* Vector-icon rasterising is native-only, so the web preview shows labels without icons. */}
          {Platform.OS === 'web' ? null : (
            <NativeTabs.Trigger.Icon sf={tab.sf} src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.icon} />} />
          )}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
