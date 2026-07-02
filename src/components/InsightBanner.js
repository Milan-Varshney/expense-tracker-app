import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { useTheme } from '../context/ThemeContext';
import { shared } from '../theme/colors';

const SEVERITY_COLOR = {
  alert: shared.coral,
  warning: shared.amber,
  positive: shared.teal,
  info: shared.violet,
};

const SEVERITY_ICON = {
  alert: '⚠️',
  warning: '⚠️',
  positive: '✓',
  info: 'ℹ️',
};

export default function InsightBanner({ insight }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const accent = SEVERITY_COLOR[insight.severity] || shared.violet;

  return (
    <Card style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{SEVERITY_ICON[insight.severity] || 'ℹ️'}</Text>
        <Text style={styles.message}>{insight.message}</Text>
      </View>
    </Card>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    icon: {
      fontSize: 16,
    },
    message: {
      color: colors.bone,
      fontSize: 14,
      flex: 1,
      lineHeight: 20,
    },
  });
