import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type Props = { value: Date; onChange: (date: Date) => void; maximumDate?: Date };

// iOS: inline spinner. Android: tap a field to open the system dialog (Android has no inline picker).
export function DatePicker({ value, onChange, maximumDate }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        maximumDate={maximumDate}
        onChange={(_, d) => d && onChange(d)}
      />
    );
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.field} accessibilityRole="button">
        <Text style={styles.fieldText}>{value.toLocaleDateString()}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="spinner"
          maximumDate={maximumDate}
          onChange={(_, d) => {
            setOpen(false);
            if (d) onChange(d);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: { borderBottomWidth: 1, borderBottomColor: '#B0B0B0', paddingVertical: 10 },
  fieldText: { fontFamily: fonts.medium, fontSize: 26, color: colors.black },
});
