import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';

export default function GenderFeedback() {
  return (
    <Sheet>
      <Image source={require('../../../assets/images/feedback.webp')} style={styles.image} contentFit="contain" />
      <Text style={sheetText.heading}>Do you feel included by our gender options?</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <PillButton label="No" onPress={() => router.back()} />
        </View>
        <View style={styles.flex}>
          <PillButton label="Yes" onPress={() => router.back()} />
        </View>
      </View>
      <PillButton label="Go back" variant="text" onPress={() => router.back()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 180 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
