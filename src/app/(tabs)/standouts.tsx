import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

export default function Standouts() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Standouts</Text>
          <Pressable onPress={() => router.push('/roses')} style={styles.roses} accessibilityRole="button">
            <Text style={styles.rosesText}>Roses (1)</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Outstanding prompts from people most your type.</Text>
        <Text style={styles.subtitle}>
          Refreshed daily.{' '}
          <Text style={styles.learnMore} onPress={() => router.push('/learn-more')}>
            Learn more.
          </Text>
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fresh out of Standouts!</Text>
          <Text style={styles.cardBody}>
            You&apos;ve seen everyone who fits your preferences, but check back soon for new people.
          </Text>
          <Pressable
            style={styles.widen}
            accessibilityRole="button"
            onPress={() => router.push('/preferences')}
          >
            <Text style={styles.widenText}>Widen Preferences</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 30, paddingTop: 40, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.black },
  roses: { backgroundColor: colors.rose, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  rosesText: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, marginTop: 10 },
  learnMore: { color: colors.purple, fontFamily: fonts.bold },
  card: {
    marginTop: 35,
    minHeight: 460,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  cardTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 26,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  cardBody: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 32,
  },
  widen: { backgroundColor: colors.purple, borderRadius: 30, paddingVertical: 16, paddingHorizontal: 36 },
  widenText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
