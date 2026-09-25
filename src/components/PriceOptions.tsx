import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

export type PriceOption = { count: string; unit: string; price: string; popular?: boolean };

// Three side-by-side tiers, as on the Android paywall screens.
export function PriceOptions({ options }: { options: PriceOption[] }) {
  const [selected, setSelected] = useState(options.findIndex((o) => o.popular));
  return (
    <View style={styles.row}>
      {options.map((o, i) => (
        <Pressable
          key={o.count}
          onPress={() => setSelected(i)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === i }}
          style={[styles.option, selected === i && styles.selected]}
        >
          <Text style={styles.popular}>{o.popular ? 'Most Popular' : ' '}</Text>
          <Text style={styles.count}>{o.count}</Text>
          <Text style={styles.unit}>{o.unit}</Text>
          <Text style={styles.price}>{o.price}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.chip,
  },
  selected: { borderColor: colors.purple, borderWidth: 2 },
  popular: { fontFamily: fonts.bold, fontSize: 10, color: colors.purple, marginBottom: 4 },
  count: { fontFamily: fonts.serifSemiBold, fontSize: 37, color: colors.black },
  unit: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  price: { fontFamily: fonts.regular, fontSize: 11, color: colors.black, marginTop: 6, textAlign: 'center' },
});
