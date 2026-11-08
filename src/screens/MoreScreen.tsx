import { useRouter, type Href } from 'expo-router';
import { ChevronRightIcon, Item, ReceiptIcon, RepeatIcon, TimerIcon, TicketIcon } from 'panelui-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import Screen from '../components/Screen';
import { usePreferences } from '../preferences/PreferencesProvider';

const links: { href: Href; label: string; icon: ReactNode }[] = [
  { href: '/transfer/internal', label: 'Internal Transfer', icon: <RepeatIcon size={20} /> },
  { href: '/transfer/swift', label: 'SWIFT Transfer', icon: <RepeatIcon size={20} /> },
  { href: '/transfer/sepa', label: 'SEPA Transfer', icon: <RepeatIcon size={20} /> },
  { href: '/more/loans', label: 'Loans', icon: <ReceiptIcon size={20} /> },
  { href: '/more/investments', label: 'Investments', icon: <TimerIcon size={20} /> },
  { href: '/crypto-deposit', label: 'Crypto Deposit', icon: <TimerIcon size={20} /> },
  { href: '/settings', label: 'Settings', icon: <TicketIcon size={20} /> },
];

export default function MoreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = usePreferences();
  const { top } = useSafeAreaInsets();

  return (
    <Screen icon="menu-outline" subtitle={session?.user.email} title={t('More')} topPadding={top + 44}>
      {links.map((link) => (
        <Item className="bg-card" key={link.label} onPress={() => router.push(link.href)}>
          <Item.Media className="bg-accent" style={{ borderWidth: 0 }} variant="icon">{link.icon}</Item.Media>
          <Item.Content><Item.Title>{t(link.label)}</Item.Title></Item.Content>
          <Item.Actions><ChevronRightIcon size={18} /></Item.Actions>
        </Item>
      ))}
    </Screen>
  );
}
