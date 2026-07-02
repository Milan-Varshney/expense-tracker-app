import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import InsightBanner from '../components/InsightBanner';
import { getMonthsList, generateInsights } from '../utils/analytics';

export default function InsightsScreen() {
  const { transactions, loading } = useTransactions();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const months = useMemo(() => getMonthsList(transactions), [transactions]);
  const activeMonth = months[0] && months[0].month;
  const insights = useMemo(
    () => (activeMonth ? generateInsights(transactions, activeMonth) : []),
    [transactions, activeMonth]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.boneDim }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={insights}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.title}>Insights</Text>}
        renderItem={({ item }) => <InsightBanner insight={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No insights for this month yet.</Text>}
      />
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
    empty: {
      color: colors.boneDim,
      fontSize: 14,
      marginTop: 20,
    },
  });
