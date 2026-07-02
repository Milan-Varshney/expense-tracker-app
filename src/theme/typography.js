import { Platform } from 'react-native';

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.OS === 'ios' ? 'Courier' : 'monospace',
};
