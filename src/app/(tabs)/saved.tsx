import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyStateCard } from '@/components/EmptyStateCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';

// Saved clinicians (tap ♥ on a match). Stored on this device only; no account needed.
export default function Saved() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Saved" />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyStateCard
          title="Nothing saved yet."
          body="Tap ♥ on a clinician you'd like to come back to and they'll appear here."
          action={{ label: 'Find a GP', onPress: () => router.navigate('/') }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
});
