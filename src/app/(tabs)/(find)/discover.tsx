import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Appear, PressDepth, PressScale } from '@/components/motion';
import { ProgressDots } from '@/components/ProgressDots';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Swipeable, type SwipeableHandle } from '@/components/Swipeable';
import { useGoals } from '@/features/care/goals';
import { goalsDraft } from '@/features/care/plan';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { article, capitalised, INTRO, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// The discovery queue: one card per kind of professional, three short facts each. Swipe right (or
// "Find one") to search that kind; left for the next. For people who don't know who could help.
export default function Discover() {
  const session = useSession();
  const { goals } = useGoals();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const deck = useRef<SwipeableHandle>(null);
  const card = PROFESSION_INFO[i];

  const next = () => setI((n) => n + 1);
  const find = () => {
    if (!card?.available) return next();
    router.push(session.chooseProfession(card.id as ProfessionChoice, goalsDraft(card.id, goals)));
  };

  if (!card) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Explore" back />
        <View style={styles.done}>
          <Text style={styles.doneTitle}>That’s everyone.</Text>
          <PressScale onPress={() => setI(0)} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>Start again</Text>
          </PressScale>
        </View>
      </View>
    );
  }

  const intro = INTRO[card.id as keyof typeof INTRO];
  const facts: [IconName, string][] = [
    ['icCheck', intro.helps],
    ['icClock', intro.sessions],
    ['icCost', intro.rebates],
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title="Explore" back right={<ProgressDots count={PROFESSION_INFO.length} index={i} label={`Card ${i + 1} of ${PROFESSION_INFO.length}`} />} />
      <Swipeable key={card.id} ref={deck} onLeft={next} onRight={find}>
        <Appear from="right" distance={i > 0 ? 50 : 0} style={styles.stage}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon name={card.icon} size={44} color={colors.black} />
            </View>
            <Text style={styles.name} accessibilityRole="header">
              {capitalised(card.one)}
            </Text>
            {!card.available ? <Text style={styles.soon}>Not in the network yet</Text> : null}
            <View style={styles.facts}>
              {facts.map(([icon, text], n) => (
                <Appear key={text} index={n + 1} distance={8}>
                  <View style={styles.fact}>
                    <Icon name={icon} size={18} color={colors.black} />
                    <Text style={styles.factText}>{text}</Text>
                  </View>
                </Appear>
              ))}
            </View>
          </View>
        </Appear>
      </Swipeable>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        <PressScale onPress={() => deck.current?.fling(-1)} accessibilityRole="button" accessibilityLabel="Next" style={styles.round} scaleTo={0.9}>
          <Icon name="icClose" size={20} color={colors.black} />
        </PressScale>
        <PressDepth
          onPress={() => (card.available ? deck.current?.fling(1) : next())}
          accessibilityRole="button"
          accessibilityLabel={card.available ? `Find ${card.many}` : 'Next'}
          style={[styles.primary, !card.available && styles.primaryOff]}
          containerStyle={styles.grow}
          radius={28}
          lipColor={card.available ? colors.purpleLip : colors.blackLip}
        >
          <Text style={styles.primaryText} numberOfLines={1}>
            {card.available ? `Find ${article(card.one)} ${card.one}` : 'Next'}
          </Text>
        </PressDepth>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: colors.white, borderRadius: 24, paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 38, color: colors.black, textAlign: 'center', marginTop: 18 },
  soon: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, marginTop: 6 },
  facts: { alignSelf: 'stretch', marginTop: 24, gap: 14 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  factText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.black },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  primary: { height: 56, borderRadius: 28, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  primaryOff: { backgroundColor: colors.black },
  primaryText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  doneTitle: { fontFamily: fonts.serifSemiBold, fontSize: 26, color: colors.black },
  secondary: { borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 22, paddingVertical: 14 },
  secondaryText: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
});
