import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';

// The profile card language from the Discover screen: white cards on the grey
// background, each with an optional like button in the bottom-right corner.

type LikeProps = { onLike?: () => void; likeLabel?: string };

export function PhotoCard({
  caption,
  source,
  onLike,
  likeLabel,
}: { caption: string; source: ImageSourcePropType } & LikeProps) {
  return (
    <Card title={caption} onLike={onLike} likeLabel={likeLabel}>
      <Image source={source} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
    </Card>
  );
}

/** Small title over a large serif answer. */
export function PromptCard({
  title,
  answer,
  onLike,
  likeLabel,
}: { title: string; answer: string } & LikeProps) {
  return (
    <Card title={title} onLike={onLike} likeLabel={likeLabel} padded>
      <Text style={styles.answer}>{answer}</Text>
    </Card>
  );
}

export type ChipItem = { icon: IconName; label: string };

/** Horizontal chip row, then optional full-width rows (the Discover "vitals" card). */
export function ChipsCard({ chips, rows = [] }: { chips: ChipItem[]; rows?: ChipItem[] }) {
  return (
    <View style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c, i) => (
          <View key={`${c.icon}-${c.label}`} style={[styles.chip, i > 0 && styles.chipDivider]}>
            <Icon name={c.icon} size={18} />
            <Text style={styles.chipText}>{c.label}</Text>
          </View>
        ))}
      </ScrollView>
      {rows.map((r) => (
        <View key={`${r.icon}-${r.label}`} style={styles.row}>
          <Icon name={r.icon} size={18} />
          <Text style={styles.chipText}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({
  title,
  children,
  onLike,
  likeLabel = 'Like',
  padded,
}: { title: string; children: ReactNode; padded?: boolean } & LikeProps) {
  return (
    <View style={[styles.card, padded && styles.cardPadded]}>
      <Text style={[styles.cardTitle, padded && styles.cardTitlePadded]}>{title}</Text>
      {children}
      {onLike ? (
        <Pressable onPress={onLike} accessibilityRole="button" accessibilityLabel={likeLabel} style={styles.like}>
          <Icon name="icLike" size={23} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardPadded: { paddingBottom: 60, paddingTop: 30 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.black, margin: 15 },
  cardTitlePadded: { marginTop: 0 },
  photo: { width: '100%', height: 370 },
  answer: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 30,
    lineHeight: 38,
    color: colors.black,
    marginHorizontal: 15,
  },
  like: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chips: { paddingHorizontal: 15, paddingVertical: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  chipDivider: { borderLeftWidth: 1, borderLeftColor: colors.chip },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 29,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
});
