import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';

import { TransactionsProvider } from './src/context/TransactionsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { mode, colors } = useTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.void,
      card: colors.panel,
      border: colors.hairline,
      text: colors.bone,
      primary: colors.amber,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TransactionsProvider>
          <AppContent />
        </TransactionsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
