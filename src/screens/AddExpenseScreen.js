import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import { CATEGORY_LIST, CATEGORIES } from '../constants/categories';

const today = () => new Date().toISOString().slice(0, 10);

export default function AddExpenseScreen({ route, navigation }) {
  const { addTransaction } = useTransactions();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const initialCategory = route.params?.category || CATEGORY_LIST[0];

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');

  const canSubmit = amount.trim().length > 0 && merchant.trim().length > 0 && !Number.isNaN(Number(amount));

  const handleSubmit = () => {
    const parsed = Number(amount);
    if (!merchant.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount and merchant.');
      return;
    }
    addTransaction({
      amount: parsed,
      merchant: merchant.trim(),
      category,
      date,
      source: 'Manual',
    });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Add expense</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sourceTabs}>
          <View style={[styles.sourceTab, styles.sourceTabActive]}>
            <Text style={styles.sourceTabTextActive}>Manual</Text>
          </View>
          <View style={styles.sourceTab}>
            <Text style={styles.sourceTabText}>Statement · Coming soon</Text>
          </View>
          <View style={styles.sourceTab}>
            <Text style={styles.sourceTabText}>SMS export · Coming soon</Text>
          </View>
        </View>

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.boneDim}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.input}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Swiggy"
          placeholderTextColor={colors.boneDim}
        />

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.boneDim}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_LIST.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryChip, category === c && styles.categoryChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={styles.categoryIcon}>{CATEGORIES[c].icon}</Text>
              <Text style={[styles.categoryLabel, category === c && { color: colors.void }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>Save expense</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.void,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      color: colors.bone,
      fontFamily: fonts.display,
      fontSize: 22,
    },
    close: {
      color: colors.boneDim,
      fontSize: 20,
    },
    sourceTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
    },
    sourceTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      opacity: 0.5,
    },
    sourceTabActive: {
      backgroundColor: colors.amber,
      borderColor: colors.amber,
      opacity: 1,
    },
    sourceTabText: {
      color: colors.boneDim,
      fontSize: 11,
      textAlign: 'center',
    },
    sourceTabTextActive: {
      color: colors.void,
      fontSize: 12,
      fontWeight: '600',
    },
    label: {
      color: colors.boneDim,
      fontSize: 13,
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.bone,
      fontFamily: fonts.mono,
      fontSize: 16,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    categoryChipActive: {
      backgroundColor: colors.amber,
      borderColor: colors.amber,
    },
    categoryIcon: {
      fontSize: 14,
    },
    categoryLabel: {
      color: colors.bone,
      fontSize: 13,
    },
    error: {
      color: colors.coral,
      fontSize: 13,
      marginTop: 16,
    },
    submit: {
      marginTop: 28,
      backgroundColor: colors.amber,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.4,
    },
    submitText: {
      color: colors.void,
      fontSize: 16,
      fontWeight: '600',
    },
  });
