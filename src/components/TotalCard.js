import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import { formatCurrency } from '../utils/format';
import { MONTHLY_BUDGET } from '../constants/categories';

export default function TotalCard({ total, delta }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const pace = Math.min(total / MONTHLY_BUDGET, 1);
  const overBudget = total > MONTHLY_BUDGET;

  return (
    <Card>
      <Text style={styles.label}>Total spent this month</Text>
      <Text style={styles.amount}>{formatCurrency(total)}</Text>

      {delta && (
        <Text style={[styles.delta, { color: delta.direction === 'up' ? colors.coral : colors.teal }]}>
          {delta.direction === 'up' ? '▲' : '▼'} {delta.percent}% vs last month
        </Text>
      )}

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pace * 100}%`, backgroundColor: overBudget ? colors.coral : colors.amber },
          ]}
        />
      </View>
      <Text style={styles.budgetLabel}>
        {formatCurrency(total)} of {formatCurrency(MONTHLY_BUDGET)} budget
      </Text>
    </Card>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    label: {
      color: colors.boneDim,
      fontSize: 13,
      marginBottom: 4,
    },
    amount: {
      color: colors.bone,
      fontFamily: fonts.mono,
      fontSize: 36,
      fontWeight: '600',
    },
    delta: {
      fontSize: 13,
      marginTop: 4,
      fontFamily: fonts.mono,
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.panelAlt,
      marginTop: 16,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
    budgetLabel: {
      color: colors.boneDim,
      fontSize: 12,
      marginTop: 8,
      fontFamily: fonts.mono,
    },
  });
