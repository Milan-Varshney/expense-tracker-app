import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  return <View style={[styles(colors).card, style]}>{children}</View>;
}

const styles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: 16,
    },
  });
