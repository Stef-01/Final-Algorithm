import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Placeholder } from '@/components/Placeholder';
import { colors, fonts } from '@/lib/theme';

// Screen 04 — matching. Only real pipeline steps are shown; skipped when results come back fast.
export default function Matching() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/matches'), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          Finding your best fits…
        </Text>
        <Placeholder phase={1} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 38, color: colors.black, textAlign: 'center' },
});
