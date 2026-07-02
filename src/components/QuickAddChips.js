import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES } from '../constants/categories';

const QUICK_CATEGORIES = ['Food & Dining', 'Transport', 'Groceries', 'Shopping'];

export default function QuickAddChips({ onSelect }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      {QUICK_CATEGORIES.map((category) => (
        <TouchableOpacity key={category} style={styles.chip} onPress={() => onSelect(category)}>
          <Text style={styles.icon}>{CATEGORIES[category].icon}</Text>
          <Text style={styles.label}>{category}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.panelAlt,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    icon: {
      fontSize: 14,
    },
    label: {
      color: colors.bone,
      fontSize: 13,
    },
  });
