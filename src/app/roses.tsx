import { Image } from 'expo-image';
import { StyleSheet, Text } from 'react-native';

import { PriceOptions } from '@/components/PriceOptions';
import { Sheet, sheetText } from '@/components/Sheet';

export default function Roses() {
  return (
    <Sheet closeButton>
      <Image
        source={require('../../assets/images/illustration_roses_paywall.webp')}
        style={styles.image}
        contentFit="contain"
      />
      <Text style={sheetText.heading}>Catch their eye by sending a Rose</Text>
      <Text style={sheetText.body}>
        Roses are always seen first and twice as likely to lead to a date. A purchased Rose never expires
      </Text>
      <PriceOptions
        options={[
          { count: '1', unit: 'Rose', price: '₹350.00' },
          { count: '6', unit: 'Roses', price: '₹1750.00 (₹291.66/each)', popular: true },
          { count: '12', unit: 'Roses', price: '₹2650.00 (₹220.83/each)' },
        ]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 200 },
});
