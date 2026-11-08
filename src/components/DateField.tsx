import { View } from 'react-native';
import { DatePicker, Label, Text } from 'panelui-native';
import { usePreferences } from '../preferences/PreferencesProvider';
import { formatDateForField, fromIsoDate, latestAdultDate, toIsoDate } from './registrationDate';

type Props = {
  label: string;
  error?: string;
  onChange: (value: string) => void;
  value: string;
};

export default function DateField({ label, error, onChange, value }: Props) {
  const { locale, t } = usePreferences();

  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <DatePicker
        captionLayout="dropdown"
        endMonth={latestAdultDate()}
        locale={locale}
        maxDate={latestAdultDate()}
        minDate={new Date(1900, 0, 1)}
        onSelect={(date) => date && onChange(toIsoDate(date))}
        placeholder={t('DD / MM / YYYY')}
        presentation="bottom-sheet"
        format={(date) => (date ? formatDateForField(toIsoDate(date)) : '')}
        selected={value ? fromIsoDate(value) : undefined}
        startMonth={new Date(1900, 0, 1)}
      />
      {error ? <Text size="sm" className="text-destructive">{error}</Text> : null}
    </View>
  );
}
