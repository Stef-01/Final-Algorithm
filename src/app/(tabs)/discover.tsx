import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProfileCards } from '@/components/ProfileCards';
import { ScreenHeader } from '@/components/ScreenHeader';
import { discoverQueue } from '@/data/people';
import { colors } from '@/lib/theme';

export default function Discover() {
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const person = discoverQueue[index % discoverQueue.length];

  // Liking or passing just moves on to the next profile, like the original.
  const next = () => {
    setIndex((i) => i + 1);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={person.name} right={<Icon name="icDiscoverOverflow" size={22} />} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Keyed so a new person remounts fresh cards instead of cross-fading from the last one's photos. */}
        <ProfileCards key={index} person={{ ...person, details: person }} onLike={next} />
      </ScrollView>
      <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Pass" style={styles.decline}>
        <Icon name="icDecline" size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  decline: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
