import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Host, RadioButton } from '@expo/ui/jetpack-compose';
import { Text } from 'panelui-native';

type Props = {
  checked: boolean;
  label: ReactNode;
  onChange: (checked: boolean) => void;
};

export default function RememberMe({ checked, label, onChange }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-1"
      onPress={() => onChange(!checked)}
    >
      <View pointerEvents="none">
        <Host matchContents>
          <RadioButton selected={checked} />
        </Host>
      </View>
      <View className="flex-1">{typeof label === 'string' ? <Text size="sm">{label}</Text> : label}</View>
    </Pressable>
  );
}
