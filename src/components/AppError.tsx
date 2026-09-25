import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { track } from '@/lib/analytics';
import { colors } from '@/lib/theme';

// Shown if a screen crashes (the root layout's ErrorBoundary). The likeliest cause is a saved search
// from an older version that no longer fits, so "Start over" clears it; saved clinicians are kept.
// Plain system text: it may render before fonts or providers are available.

export function AppError({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    // The error's type only: messages can contain data.
    track('app_error', { kind: error.name.slice(0, 40) });
  }, [error]);

  return (
    <View style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        Something went wrong.
      </Text>
      <Text style={styles.body}>Sorry about that. Starting over usually fixes it. Your saved clinicians are kept.</Text>
      <Pressable
        style={styles.primary}
        accessibilityRole="button"
        onPress={async () => {
          await AsyncStorage.removeItem('watl_session').catch(() => {});
          await retry();
        }}
      >
        <Text style={styles.primaryText}>Start over</Text>
      </Pressable>
      <Pressable style={styles.secondary} accessibilityRole="button" onPress={() => void retry()}>
        <Text style={styles.secondaryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '600', color: colors.black, marginBottom: 12 },
  body: { fontSize: 17, lineHeight: 24, color: colors.black, marginBottom: 28 },
  primary: { backgroundColor: colors.purple, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700', color: colors.white },
  secondary: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  secondaryText: { fontSize: 16, color: colors.black },
});
