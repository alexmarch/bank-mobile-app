import { useState } from 'react';
import { Alert, Dialog, Pagination, SearchBar, Select, Tabs } from 'panelui-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApi } from '../api/useApi';
import { api } from '../api/client';
import { Empty, TransactionList } from '../components/banking';
import { PrimaryButton, SecondaryButton } from '../components/fields';
import Screen from '../components/Screen';
import { type AppLocale } from '../localization/i18n';
import { usePreferences } from '../preferences/PreferencesProvider';

const PAGE_SIZE = 15;
const REPORT_LANGUAGES: { code: AppLocale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ru', label: 'Russian' },
];

export default function TransactionsScreen() {
  const { locale, t } = usePreferences();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [reportLanguage, setReportLanguage] = useState<AppLocale>(locale);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reportError, setReportError] = useState('');
  const params = `filter=${filter}&page=${page}&pageSize=${PAGE_SIZE}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
  const { data, error, loading, refreshing, refresh } = useApi(`/me/transactions-page?${params}`);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const chooseReportLanguage = (transaction: any) => {
    setReportError('');
    setReportLanguage(locale);
    setSelectedTransaction(transaction);
  };

  const downloadReport = async () => {
    if (!selectedTransaction) return;
    const transactionId = String(selectedTransaction.id);
    setDownloadingId(transactionId);
    setReportError('');
    try {
      const bytes = await api.getBytes(`/me/transactions/${transactionId}/report?language=${reportLanguage}`);
      const file = new File(Paths.cache, `transfer-report-${transactionId}-${reportLanguage}-${Date.now()}.docx`) as any;
      await file.write(new Uint8Array(bytes));
      if (!await Sharing.isAvailableAsync()) throw new Error(t('Sharing is unavailable on this device.'));
      await Sharing.shareAsync(file.uri, {
        dialogTitle: t('Transfer report'),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      setSelectedTransaction(null);
    } catch (downloadError) {
      setReportError(downloadError instanceof Error ? downloadError.message : 'Request failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Screen icon="receipt-outline" error={error} loading={loading && !data} onRefresh={refresh} refreshing={refreshing} title={t('Transactions')}>
      {reportError ? (
        <Alert variant="destructive">
          <Alert.Content><Alert.Description>{reportError}</Alert.Description></Alert.Content>
        </Alert>
      ) : null}
      <Tabs
        defaultValue="all"
        onValueChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        value={filter}
        variant="underline"
      >
        <Tabs.List>
          <Tabs.Trigger value="all">{t('All')}</Tabs.Trigger>
          <Tabs.Trigger value="income">{t('Income')}</Tabs.Trigger>
          <Tabs.Trigger value="expense">{t('Expense')}</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <SearchBar
        autoCapitalize="none"
        debounce={400}
        onDebouncedChange={(value) => {
          setQuery(value.trim());
          setPage(1);
        }}
        placeholder={t('Search')}
      />
      {data?.items.length
        ? <TransactionList downloadingId={downloadingId} items={data.items} onDownload={chooseReportLanguage} />
        : data ? <Empty description="Transactions will appear here after your first payment or transfer." icon="swap-horizontal-outline" size="page" title="No transactions yet" /> : null}
      {data && pages > 1 ? <Pagination count={pages} onPageChange={setPage} page={page} variant="compact" /> : null}
      <Dialog
        onOpenChange={(open) => {
          if (!open && !downloadingId) setSelectedTransaction(null);
        }}
        open={Boolean(selectedTransaction)}
      >
        <Dialog.Content>
          <Dialog.Title>{t('Select report language')}</Dialog.Title>
          <Dialog.Description>{t('Choose the language for your transfer report.')}</Dialog.Description>
          <Select
            disabled={Boolean(downloadingId)}
            onValueChange={(value) => {
              const language = REPORT_LANGUAGES.find((item) => item.code === value);
              if (language) setReportLanguage(language.code);
            }}
            presentation="overlay"
            title={t('Report language')}
            value={reportLanguage}
          >
            {REPORT_LANGUAGES.map((language) => (
              <Select.Item key={language.code} label={t(language.label)} value={language.code} />
            ))}
          </Select>
          <Dialog.Footer>
            <SecondaryButton disabled={Boolean(downloadingId)} onPress={() => setSelectedTransaction(null)}>
              {t('Cancel')}
            </SecondaryButton>
            <PrimaryButton disabled={Boolean(downloadingId)} onPress={downloadReport}>
              {t(downloadingId ? 'Preparing…' : 'Download report')}
            </PrimaryButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </Screen>
  );
}
