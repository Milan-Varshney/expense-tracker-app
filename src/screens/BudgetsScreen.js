import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import Card from '../components/Card';
import CategoryBar from '../components/CategoryBar';
import { BUDGETS, SOURCES } from '../constants/categories';
import { formatCurrency } from '../utils/format';
import { getMonthsList, filterByMonth, getCategoryTotals } from '../utils/analytics';

const CONNECTED_SOURCES = new Set(['Manual']);

export default function BudgetsScreen() {
  const { transactions, loading } = useTransactions();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const months = useMemo(() => getMonthsList(transactions), [transactions]);
  const activeMonth = months[0] && months[0].month;
  const monthTxns = useMemo(
    () => (activeMonth ? filterByMonth(transactions, activeMonth) : []),
    [transactions, activeMonth]
  );
  const categoryTotals = useMemo(() => getCategoryTotals(monthTxns), [monthTxns]);
  const totalsByCategory = useMemo(() => {
    const map = new Map();
    categoryTotals.forEach(({ category, total }) => map.set(category, total));
    return map;
  }, [categoryTotals]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.boneDim }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}>
        <Text style={styles.title}>Budgets</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget vs actual</Text>
          <Card>
            {Object.entries(BUDGETS).map(([category, budget]) => {
              const actual = totalsByCategory.get(category) || 0;
              return (
                <CategoryBar
                  key={category}
                  category={category}
                  amount={actual}
                  fraction={actual / budget}
                  overBudget={actual > budget}
                  rightLabel={`${formatCurrency(actual)} / ${formatCurrency(budget)}`}
                />
              );
            })}
          </Card>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Connected sources</Text>
          <Card>
            {SOURCES.map((source) => {
              const connected = CONNECTED_SOURCES.has(source);
              return (
                <View key={source} style={styles.sourceRow}>
                  <Text style={styles.sourceName}>{source}</Text>
                  <Text style={[styles.sourceStatus, { color: connected ? colors.teal : colors.boneDim }]}>
                    {connected ? 'Active' : 'Not connected'}
                  </Text>
                </View>
              );
            })}
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
    loading: {
      flex: 1,
      backgroundColor: colors.void,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.bone,
      fontFamily: fonts.display,
      fontSize: 22,
      marginBottom: 16,
    },
    section: {
      marginTop: 12,
    },
    sectionTitle: {
      color: colors.boneDim,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    sourceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    sourceName: {
      color: colors.bone,
      fontSize: 14,
    },
    sourceStatus: {
      fontSize: 13,
    },
  });
