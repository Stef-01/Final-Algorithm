import { Image, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';

export default function Matches() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Matches" />
      <View style={styles.empty}>
        <Image source={require('../../../assets/images/empty_matches.png')} style={styles.image} />
        <Text style={styles.text}>New matches will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  image: { width: 220, height: 220, resizeMode: 'contain' },
  text: { fontFamily: fonts.medium, fontSize: 17, color: colors.line, marginTop: 24 },
});
