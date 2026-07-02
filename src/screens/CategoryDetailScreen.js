import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import Card from '../components/Card';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/format';
import { getCategoryTrend, getMerchantBreakdown } from '../utils/analytics';

function TrendChart({ trend, color }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const max = Math.max(...trend.map((m) => m.total), 1);
  return (
    <View style={styles.chartRow}>
      {trend.map((m) => (
        <View key={m.month} style={styles.chartBarWrap}>
          <View style={styles.chartBarTrack}>
            <View
              style={[
                styles.chartBarFill,
                { height: `${(m.total / max) * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.chartLabel}>{m.month.slice(5)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CategoryDetailScreen({ route, navigation }) {
  const { category } = route.params;
  const { transactions } = useTransactions();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const meta = CATEGORIES[category] || CATEGORIES.Other;

  const trend = useMemo(() => getCategoryTrend(transactions, category, 6), [transactions, category]);
  const merchants = useMemo(() => getMerchantBreakdown(transactions, category), [transactions, category]);
  const total = trend.length ? trend[trend.length - 1].total : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.icon}>{meta.icon}</Text>
          <Text style={styles.title}>{category}</Text>
        </View>
        <Text style={styles.subtitle}>{formatCurrency(total)} this month</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6-month trend</Text>
          <Card>
            <TrendChart trend={trend} color={meta.color} />
          </Card>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>By merchant</Text>
          <Card>
            {merchants.map(({ merchant, total: merchantTotal }) => (
              <View key={merchant} style={styles.merchantRow}>
                <Text style={styles.merchantName}>{merchant}</Text>
                <Text style={styles.merchantAmount}>{formatCurrency(merchantTotal)}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.void,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    headerRow: {
      marginBottom: 12,
    },
    back: {
      color: colors.amber,
      fontSize: 15,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    icon: {
      fontSize: 24,
    },
    title: {
      color: colors.bone,
      fontFamily: fonts.display,
      fontSize: 24,
    },
    subtitle: {
      color: colors.boneDim,
      fontFamily: fonts.mono,
      fontSize: 14,
      marginTop: 4,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      color: colors.boneDim,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    chartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 140,
    },
    chartBarWrap: {
      flex: 1,
      alignItems: 'center',
    },
    chartBarTrack: {
      flex: 1,
      width: 18,
      justifyContent: 'flex-end',
    },
    chartBarFill: {
      width: '100%',
      borderRadius: 4,
      minHeight: 4,
    },
    chartLabel: {
      color: colors.boneDim,
      fontSize: 10,
      marginTop: 6,
    },
    merchantRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    merchantName: {
      color: colors.bone,
      fontSize: 14,
    },
    merchantAmount: {
      color: colors.boneDim,
      fontFamily: fonts.mono,
      fontSize: 14,
    },
  });
