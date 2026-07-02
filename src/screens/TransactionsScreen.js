import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import TransactionRow from '../components/TransactionRow';

export default function TransactionsScreen() {
  const { transactions, loading } = useTransactions();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const sorted = useMemo(
    () => transactions.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
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
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.title}>Activity</Text>}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    separator: {
      height: 1,
      backgroundColor: colors.hairline,
    },
  });
