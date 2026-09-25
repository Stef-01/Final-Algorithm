import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyStateCard } from '@/components/EmptyStateCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';

// Screen 05 — top matches, shown in the Discover card layout from Phase 1.
export default function Matches() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Your matches" />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyStateCard
          title="Matches appear here soon."
          body="Clinician cards arrive in Phase 1. For now you can open the clinician page placeholder."
          action={{ label: 'View a clinician', onPress: () => router.push('/clinician/demo') }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
});
