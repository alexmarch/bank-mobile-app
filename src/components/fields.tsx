import { useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { Button, EyeIcon, Input, InputGroup, Label, Text } from 'panelui-native';
import { usePreferences } from '../preferences/PreferencesProvider';

type InputProps = ComponentProps<typeof Input>;

export function TextField(props: InputProps) {
  return <Input autoCorrect={false} {...props} />;
}

type PasswordFieldProps = Omit<ComponentProps<typeof InputGroup.Input>, 'secureTextEntry'> & {
  label?: string;
  description?: string;
  errorMessage?: string;
};

// InputGroup measures the eye toggle, so the text never runs under it.
export function PasswordField({ label, description, errorMessage, ...props }: PasswordFieldProps) {
  const { t } = usePreferences();
  const [visible, setVisible] = useState(false);

  return (
    <View className="gap-2">
      {label ? <Label>{label}</Label> : null}
      <InputGroup>
        <InputGroup.Input
          autoCapitalize="none"
          autoCorrect={false}
          aria-invalid={errorMessage ? true : undefined}
          {...props}
          secureTextEntry={!visible}
        />
        <InputGroup.Suffix>
          <Button
            accessibilityLabel={t(visible ? 'Hide password' : 'Show password')}
            onPress={() => setVisible((value) => !value)}
            size="icon"
            variant="ghost"
          >
            {visible ? <EyeIcon size={18} /> : <EyeIcon color="#94a3b8" size={18} />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {errorMessage ? (
        <Text size="sm" className="text-destructive">{errorMessage}</Text>
      ) : description ? (
        <Text size="sm" muted>{description}</Text>
      ) : null}
    </View>
  );
}

type ButtonProps = ComponentProps<typeof Button>;

export function PrimaryButton(props: ButtonProps) {
  return <Button size="lg" variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button size="lg" variant="outline" {...props} />;
}
