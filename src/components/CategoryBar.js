import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/format';

export default function CategoryBar({ category, amount, fraction, rightLabel, overBudget, onPress }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const meta = CATEGORIES[category] || CATEGORIES.Other;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={styles.icon}>{meta.icon}</Text>
          <Text style={styles.name}>{category}</Text>
        </View>
        <Text style={styles.amount}>{rightLabel || formatCurrency(amount)}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(fraction, 1) * 100}%`,
              backgroundColor: overBudget ? colors.coral : meta.color,
            },
          ]}
        />
      </View>
    </Wrapper>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: {
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    icon: {
      fontSize: 15,
    },
    name: {
      color: colors.bone,
      fontSize: 14,
    },
    amount: {
      color: colors.boneDim,
      fontFamily: fonts.mono,
      fontSize: 13,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.panelAlt,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
  });
