import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/match/session';
import { colors, fonts } from '@/lib/theme';

// Screen 04 — matching. No fake progress: results move on as soon as they're ready (PRD §28).
// `?hold=1` keeps the screen up for review from /dev/states.
export default function Matching() {
  const session = useSession();
  const { hold } = useLocalSearchParams<{ hold?: string }>();
  const { loaded, match } = session;
  const started = useRef(false);

  useEffect(() => {
    if (!loaded || hold || started.current) return;
    started.current = true;
    router.replace(match());
  }, [loaded, hold, match]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          Finding your best fits…
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 38, color: colors.black, textAlign: 'center' },
});
