import { Host, Icon, IconButton, Text, TopAppBar } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import DarkMode from '@expo/material-symbols/dark_mode.xml';
import LightMode from '@expo/material-symbols/light_mode.xml';
import { usePreferences } from '../preferences/PreferencesProvider';

type Props = {
  title: string;
  onBack: () => void;
};

export default function AuthTopBar({ title, onBack }: Props) {
  const { mode, toggleMode, t } = usePreferences();
  const dark = mode === 'dark';
  const content = dark ? '#f5f7ff' : '#343c6a';

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <TopAppBar
        colors={{
          containerColor: dark ? '#111a2e' : '#ffffff',
          titleContentColor: content,
          navigationIconContentColor: content,
          actionIconContentColor: content,
        }}
        modifiers={[fillMaxWidth()]}
      >
        <TopAppBar.NavigationIcon>
          <IconButton onClick={onBack}>
            <Icon contentDescription={t('Back')} source={ArrowBack} />
          </IconButton>
        </TopAppBar.NavigationIcon>
        <TopAppBar.Title>
          <Text style={{ typography: 'titleLarge' }}>{title}</Text>
        </TopAppBar.Title>
        <TopAppBar.Actions>
          <IconButton onClick={toggleMode}>
            <Icon
              contentDescription={t(dark ? 'Switch to light mode' : 'Switch to dark mode')}
              source={dark ? LightMode : DarkMode}
            />
          </IconButton>
        </TopAppBar.Actions>
      </TopAppBar>
    </Host>
  );
}
