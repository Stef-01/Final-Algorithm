import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';

// The profile card language from the Discover screen: white cards on the grey
// background, each with an optional like button in the bottom-right corner.

type LikeProps = { onLike?: () => void; likeLabel?: string; liked?: boolean };

export function PhotoCard({
  caption,
  source,
  onPress,
  accessibilityLabel,
  ...like
}: { caption: string; source: ImageSourcePropType; onPress?: () => void; accessibilityLabel?: string } & LikeProps) {
  const image = <Image source={source} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <Card title={caption} {...like}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
          {image}
        </Pressable>
      ) : (
        image
      )}
    </Card>
  );
}

/** Small title over a large serif answer. */
export function PromptCard({ title, answer, ...like }: { title: string; answer: string } & LikeProps) {
  return (
    <Card title={title} {...like} padded>
      <Text style={styles.answer}>{answer}</Text>
    </Card>
  );
}

/** Small title over regular body text (bios and other longer copy). */
export function TextCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={[styles.card, styles.textCard]}>
      <Text style={[styles.cardTitle, styles.cardTitlePadded]}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export type ChipItem = { icon: IconName; label: string };

/** Horizontal chip row, then optional full-width rows (the Discover "vitals" card). */
export function ChipsCard({
  chips,
  rows = [],
  rowsTitle,
}: {
  chips: ChipItem[];
  rows?: ChipItem[];
  rowsTitle?: string;
}) {
  return (
    <View style={styles.card}>
      {chips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((c, i) => (
            <View key={`${c.icon}-${c.label}`} style={[styles.chip, i > 0 && styles.chipDivider]}>
              <Icon name={c.icon} size={18} color={colors.black} />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {rowsTitle && rows.length > 0 ? (
        <Text style={[styles.rowsTitle, chips.length === 0 && styles.rowsTitleFirst]}>{rowsTitle}</Text>
      ) : null}
      {rows.map((r) => (
        <View key={`${r.icon}-${r.label}`} style={styles.row}>
          <Icon name={r.icon} size={18} color={colors.black} />
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
  liked,
  padded,
}: { title: string; children: ReactNode; padded?: boolean } & LikeProps) {
  return (
    <View style={[styles.card, padded && styles.cardPadded]}>
      <Text style={[styles.cardTitle, padded && styles.cardTitlePadded]}>{title}</Text>
      {children}
      {onLike ? (
        <Pressable
          onPress={onLike}
          accessibilityRole="button"
          accessibilityLabel={likeLabel}
          accessibilityState={{ selected: !!liked }}
          style={styles.like}
        >
          <Icon name={liked ? 'heartPink' : 'icLike'} size={23} />
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
  rowsTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.line,
    paddingHorizontal: 29,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  rowsTitleFirst: { borderTopWidth: 0, paddingTop: 18 },
  textCard: { paddingTop: 30, paddingBottom: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.black, marginHorizontal: 15 },
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
