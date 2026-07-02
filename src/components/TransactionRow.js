import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency, formatDate } from '../utils/format';

export default function TransactionRow({ transaction }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const meta = CATEGORIES[transaction.category] || CATEGORIES.Other;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.panelAlt }]}>
        <Text style={styles.icon}>{meta.icon}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant}
        </Text>
        <Text style={styles.meta}>
          {formatDate(transaction.date)} · {transaction.source}
          {transaction.needsReview ? ' · Needs review' : ''}
        </Text>
      </View>
      <Text style={[styles.amount, transaction.direction === 'credit' && { color: colors.teal }]}>
        {transaction.direction === 'credit' ? '+' : '-'}
        {formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      fontSize: 16,
    },
    middle: {
      flex: 1,
    },
    merchant: {
      color: colors.bone,
      fontSize: 14,
      marginBottom: 2,
    },
    meta: {
      color: colors.boneDim,
      fontSize: 12,
    },
    amount: {
      color: colors.bone,
      fontFamily: fonts.mono,
      fontSize: 14,
    },
  });
