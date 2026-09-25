import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PriceOptions } from '@/components/PriceOptions';
import { Sheet } from '@/components/Sheet';
import { colors, fonts } from '@/lib/theme';

const slides = [
  {
    image: require('../../assets/images/illustration_paywall_control_1.webp'),
    title: "Preferred Members get twice as many dates. Here's Why...",
    body: '',
  },
  {
    image: require('../../assets/images/learn_more_image2.jpeg'),
    title: 'See everyone who likes you.',
    body: 'All in one organised place.',
  },
  {
    image: require('../../assets/images/learn_more_image3.jpeg'),
    title: 'Set advanced preferences.',
    body: 'Education, family plans, politics and vices',
  },
  {
    image: require('../../assets/images/learn_more_image4.jpeg'),
    title: 'Send unlimited likes.',
    body: 'Find your person sooner',
  },
];

export default function LearnMore() {
  const { width } = useWindowDimensions();
  const slideWidth = width - 48;

  return (
    <Sheet closeButton>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: slideWidth }}>
        {slides.map((s) => (
          <View key={s.title} style={[styles.slide, { width: slideWidth }]}>
            <Image source={s.image} style={styles.image} contentFit="contain" />
            <Text style={styles.title}>{s.title}</Text>
            {s.body ? <Text style={styles.body}>{s.body}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <PriceOptions
        options={[
          { count: '1', unit: 'months', price: '₹1650.00' },
          { count: '3', unit: 'months', price: '₹3300.00 (₹1100/month)', popular: true },
          { count: '6', unit: 'months', price: '₹4950.00 (₹825.00/month)' },
        ]}
      />
      <Text style={styles.recurring}>Recurring billing, cancel anytime.</Text>
      <Text style={styles.legal}>
        By tapping Continue, your payment will be charged to your app store account, and your subscription will
        automatically renew for the same package length at the same price until you cancel in your store settings.
      </Text>
      <Text style={styles.restore}>Restore subscription</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  slide: { alignItems: 'center' },
  image: { width: '100%', height: 200 },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.black,
    textAlign: 'center',
    marginTop: 16,
  },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.black, marginTop: 6 },
  recurring: { fontFamily: fonts.medium, fontSize: 15, color: colors.black, textAlign: 'center' },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.line,
    textAlign: 'center',
    marginTop: 8,
  },
  restore: { fontFamily: fonts.bold, fontSize: 14, color: colors.purple, textAlign: 'center', marginTop: 16 },
});
