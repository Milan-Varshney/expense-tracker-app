import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/typography';
import { formatMonthLabel } from '../utils/format';

export default function MonthDropdown({ months, selectedMonth, onSelect }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{formatMonthLabel(selectedMonth)}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={months}
              keyExtractor={(item) => item.month}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.month);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.month === selectedMonth && { color: colors.amber },
                    ]}
                  >
                    {formatMonthLabel(item.month)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    label: {
      color: colors.bone,
      fontFamily: fonts.display,
      fontSize: 17,
    },
    chevron: {
      color: colors.boneDim,
      fontSize: 13,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    sheet: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.hairline,
      maxHeight: 320,
      paddingVertical: 8,
    },
    option: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    optionText: {
      color: colors.bone,
      fontSize: 16,
    },
  });
