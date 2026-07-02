import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import Card from '../components/Card';
import MonthDropdown from '../components/MonthDropdown';
import TotalCard from '../components/TotalCard';
import InsightBanner from '../components/InsightBanner';
import QuickAddChips from '../components/QuickAddChips';
import TransactionRow from '../components/TransactionRow';
import CategoryBar from '../components/CategoryBar';
import { formatCurrency } from '../utils/format';
import {
  getMonthsList,
  filterByMonth,
  getCategoryTotals,
  getTopTransactions,
  getRecentTransactions,
  getMonthOverMonthDelta,
  generateInsights,
  getUpcomingRenewals,
} from '../utils/analytics';

export default function HomeScreen({ navigation }) {
  const { transactions, loading } = useTransactions();
  const { colors, mode, toggleTheme } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const months = useMemo(() => getMonthsList(transactions), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const activeMonth = selectedMonth || (months[0] && months[0].month);

  const monthTxns = useMemo(
    () => (activeMonth ? filterByMonth(transactions, activeMonth) : []),
    [transactions, activeMonth]
  );
  const total = monthTxns.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
  const delta = activeMonth ? getMonthOverMonthDelta(transactions, activeMonth) : null;
  const categoryTotals = useMemo(() => getCategoryTotals(monthTxns), [monthTxns]);
  const topTransactions = useMemo(() => getTopTransactions(monthTxns, 5), [monthTxns]);
  const recentTransactions = useMemo(() => getRecentTransactions(transactions, 2), [transactions]);
  const insights = useMemo(
    () => (activeMonth ? generateInsights(transactions, activeMonth) : []),
    [transactions, activeMonth]
  );
  const renewals = useMemo(() => getUpcomingRenewals(transactions).slice(0, 3), [transactions]);
  const maxCategoryTotal = categoryTotals[0] ? categoryTotals[0].total : 1;

  if (loading || !activeMonth) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.boneDim }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.appName}>HisabKitab</Text>
        <View style={styles.headerBottomRow}>
          <MonthDropdown months={months} selectedMonth={activeMonth} onSelect={setSelectedMonth} />
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Text style={styles.themeToggleIcon}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TotalCard total={total} delta={delta} />

        {insights.length > 0 && (
          <View style={styles.section}>
            <InsightBanner insight={insights[0]} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick add</Text>
          <QuickAddChips
            onSelect={(category) => navigation.navigate('AddExpense', { category })}
          />
        </View>

        {topTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top transactions</Text>
            <Card>
              {topTransactions.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Activity')}>
              <Text style={styles.link}>History →</Text>
            </TouchableOpacity>
          </View>
          <Card>
            {recentTransactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </Card>
        </View>

        {renewals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming renewals</Text>
            <Card>
              {renewals.map((r) => (
                <View key={r.merchant} style={styles.renewalRow}>
                  <Text style={styles.renewalMerchant}>{r.merchant}</Text>
                  <Text style={styles.renewalMeta}>
                    {formatCurrency(r.amount)} · renews in {r.daysUntil} day{r.daysUntil === 1 ? '' : 's'}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Category breakdown</Text>
          <Card>
            {categoryTotals.map(({ category, total: catTotal }) => (
              <CategoryBar
                key={category}
                category={category}
                amount={catTotal}
                fraction={catTotal / maxCategoryTotal}
                onPress={() => navigation.navigate('CategoryDetail', { category })}
              />
            ))}
          </Card>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.void,
    },
    appName: {
      color: colors.bone,
      fontFamily: fonts.display,
      fontSize: 24,
      marginBottom: 12,
    },
    headerBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeToggle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.panelAlt,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleIcon: {
      fontSize: 16,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    section: {
      marginTop: 20,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      color: colors.boneDim,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    link: {
      color: colors.amber,
      fontSize: 13,
    },
    renewalRow: {
      paddingVertical: 8,
    },
    renewalMerchant: {
      color: colors.bone,
      fontSize: 14,
      marginBottom: 2,
    },
    renewalMeta: {
      color: colors.boneDim,
      fontFamily: fonts.mono,
      fontSize: 12,
    },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.amber,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabIcon: {
      color: colors.void,
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '600',
    },
  });
