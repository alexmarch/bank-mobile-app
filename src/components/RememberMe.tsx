import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'panelui-native';

type Props = {
  checked: boolean;
  label: ReactNode;
  onChange: (checked: boolean) => void;
};

// A single radio-style toggle, matching the Compose RadioButton used on Android.
export default function RememberMe({ checked, label, onChange }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-3 py-1"
      onPress={() => onChange(!checked)}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${checked ? 'border-primary' : 'border-muted-foreground'}`}
      >
        {checked ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
      </View>
      <View className="flex-1">{typeof label === 'string' ? <Text size="sm">{label}</Text> : label}</View>
    </Pressable>
  );
}
