import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { Image, View } from 'react-native';
import { useBrand, useBrandColor } from '../brand/BrandProvider';
import { PrimaryButton } from './fields';
import { ArrowDownIcon, ArrowUpIcon, Badge, Button, Card, EmptyState, Item, LockIcon, ReceiptIcon, Text } from 'panelui-native';
import { formatDate, formatMoney } from '../format';
import { usePreferences } from '../preferences/PreferencesProvider';

type EmptyProps = {
  text?: string;
  title?: string;
  description?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  size?: 'page' | 'inline';
};

// Shared empty state: tinted icon tile, title, description and an optional primary action.
export function Empty({ text, title, description, icon = 'file-tray-outline', actionLabel, onAction, actionDisabled, size = 'inline' }: EmptyProps) {
  const { t } = usePreferences();
  const primary = useBrandColor();
  const page = size === 'page';
  return (
    <View className="items-center px-2" style={{ gap: page ? 32 : 20, paddingTop: page ? 48 : 16, paddingBottom: page ? 24 : 16 }}>
      <View className="items-center justify-center bg-accent" style={{ width: page ? 96 : 72, height: page ? 96 : 72, borderRadius: page ? 28 : 22 }}>
        <Ionicons color={primary} name={icon} size={page ? 40 : 30} />
      </View>
      <View className="w-full items-center gap-3">
        <Text className="text-center" size={page ? '2xl' : 'xl'} weight="semibold">{t(title ?? text ?? '')}</Text>
        {description ? <Text className="text-center" muted size="base">{t(description)}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <PrimaryButton disabled={actionDisabled} onPress={onAction}>{t(actionLabel)}</PrimaryButton>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { t } = usePreferences();
  return <Text className="pt-2" size="lg" weight="semibold">{t(children)}</Text>;
}

export function StatusBadge({ status }: { status?: string }) {
  const { t } = usePreferences();
  if (!status) return null;
  const variant = ['active', 'completed', 'approved', 'paid'].includes(status)
    ? 'success'
    : ['blocked', 'rejected', 'failed', 'frozen'].includes(status) ? 'destructive' : 'secondary';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge style={{ borderWidth: 0 }} variant={variant}>{t(label)}</Badge>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  const { t } = usePreferences();
  return (
    <Card className="min-w-[46%] flex-1 gap-1 p-4">
      <Text size="xs" muted>{t(label)}</Text>
      <Text size="lg" weight="semibold">{value}</Text>
    </Card>
  );
}

export function BalanceCard({ label, value }: { label: string; value: string }) {
  const { t } = usePreferences();
  return (
    <Card className="gap-1 border-0 bg-primary p-5">
      <Text className="text-primary-foreground/80" size="sm">{t(label)}</Text>
      <Text className="text-primary-foreground" size="3xl" weight="bold">{value}</Text>
    </Card>
  );
}

function shade(hex: string, factor: number) {
  const channels = [1, 3, 5].map((index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * factor));
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

// Alternates blue and white cards like the portal; the blue gradient follows the bank's primary colour.
export function BankCardView({ card, index = 0 }: { card: any; index?: number }) {
  const { t } = usePreferences();
  const { primary } = useBrand();
  const blocked = card.status === 'blocked';
  const light = index % 2 === 1;
  const start = primary ?? '#2d60ff';
  const end = primary ? shade(primary, 0.85) : '#1814f3';
  const text = light ? 'text-card-foreground' : 'text-white';
  const muted = light ? 'text-muted-foreground' : 'text-white/70';
  const content = (
    <>
      <View className="gap-4 px-5 pt-5" style={blocked ? { opacity: 0.6 } : undefined}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className={muted} size="xs">{t('Balance')}</Text>
            <Text className={text} size="xl" weight="bold">
              {formatMoney(card.accountBalanceMinor, card.accountCurrency)}
            </Text>
          </View>
          <Image source={require('../../assets/images/chip.png')} style={{ height: 34, width: 34, tintColor: light ? start : '#ffffff' }} />
        </View>
        <View className="flex-row items-end justify-between">
          <View className="shrink">
            <Text className={muted} size="xs">{t('Card Holder')}</Text>
            <Text className={text} numberOfLines={1} size="sm" weight="medium">{card.cardholderName || '—'}</Text>
          </View>
          <View className="items-end">
            <Text className={muted} size="xs">{t('Valid Thru')}</Text>
            <Text className={text} size="sm" weight="medium">
              {String(card.expirationMonth ?? '').padStart(2, '0')}/{String(card.expirationYear ?? '').slice(-2)}
            </Text>
          </View>
        </View>
      </View>
      <View
        className={`mt-4 flex-row items-center justify-between border-t px-5 py-3 ${light ? 'border-border' : 'border-white/15 bg-white/10'}`}
        style={blocked ? { opacity: 0.6 } : undefined}
      >
        <Text className={`tracking-widest ${text}`} size="base">•••• •••• •••• {card.lastFour ?? '----'}</Text>
      </View>
      {blocked ? (
        <View className="absolute right-4 top-[78px] flex-row items-center gap-1 rounded-full bg-destructive px-3 py-1" pointerEvents="none">
          <LockIcon color="#ffffff" size={13} />
          <Text className="text-white" size="xs" weight="semibold">{t('Blocked')}</Text>
        </View>
      ) : null}
    </>
  );
  const frame = `overflow-hidden rounded-3xl border-2 ${blocked ? 'border-destructive' : light ? 'border-border' : 'border-transparent'}`;
  return light ? (
    <View className={`${frame} bg-card`}>{content}</View>
  ) : (
    <LinearGradient colors={[start, end]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={{ borderRadius: 24 }}>
      <View className={frame}>{content}</View>
    </LinearGradient>
  );
}

export function AccountRow({ account }: { account: any }) {
  const { t } = usePreferences();
  return (
    <Item className="bg-card">
      <Item.Media className="bg-accent" style={{ borderWidth: 0 }} variant="icon">
        <ReceiptIcon size={20} />
      </Item.Media>
      <Item.Content>
        <Item.Title>{account.name || t('Account')}</Item.Title>
        <Item.Description>{account.accountNumber ?? account.iban ?? ''}</Item.Description>
      </Item.Content>
      <Item.Actions>
        <View className="items-end gap-1">
          <Text weight="semibold">{formatMoney(account.balanceMinor, account.currency)}</Text>
          <StatusBadge status={account.status} />
        </View>
      </Item.Actions>
    </Item>
  );
}

export function TransactionList({ items, onDownload, downloadingId }: {
  items: any[];
  onDownload?: (item: any) => void;
  downloadingId?: string | null;
}) {
  return (
    <View className="rounded-3xl bg-card px-4 py-2">
      {items.map((item, i) => (
        <TransactionRow
          downloading={downloadingId === String(item.id)}
          item={item}
          key={item.id}
          last={i === items.length - 1}
          onDownload={onDownload}
        />
      ))}
    </View>
  );
}

export function TransactionRow({ item, last, onDownload, downloading }: {
  item: any;
  last?: boolean;
  onDownload?: (item: any) => void;
  downloading?: boolean;
}) {
  const { t } = usePreferences();
  const credit = Number(item.amountMinor ?? 0) >= 0;
  const amount = Math.abs(Number(item.amountMinor ?? 0));
  const color = credit ? '#16dbaa' : '#ff4b4a';
  const reportAvailable = String(item.category).startsWith('transfer_') && onDownload;
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-11 w-11 items-center justify-center rounded-full border border-muted-foreground">
        {credit ? <ArrowDownIcon color="#718ebf" size={22} /> : <ArrowUpIcon color="#718ebf" size={22} />}
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} weight="medium">
          {item.description || item.counterpartyName || item.category || t('Transaction')}
        </Text>
        <Text className="text-muted-foreground" size="sm">
          {formatDate(item.createdAt)}{item.cardMasked ? ` · ${String(item.cardMasked).replace(/\*/g, '•')}` : ''}
        </Text>
        {reportAvailable ? (
          <Button
            className="self-start"
            disabled={downloading}
            onPress={() => onDownload(item)}
            size="xs"
            variant="outline"
          >
            {t(downloading ? 'Preparing…' : 'Download report')}
          </Button>
        ) : null}
      </View>
      <Text style={{ color }} weight="medium">
        {credit ? '+' : '-'}{formatMoney(amount, item.currency)}
      </Text>
    </View>
  );
}
