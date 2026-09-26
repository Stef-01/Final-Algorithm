import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { NOTE_MAX } from "@server/feedback";

import { getClinician } from "@/data/clinicians";
import { sendPractitionerRating } from "@/features/care/ratePrompt";
import { track } from "@/lib/analytics";
import { tap } from "@/lib/haptics";
import { colors, fonts } from "@/lib/theme";
import { Icon } from "./Icon";
import { Appear, Burst, PressDepth, PressScale } from "./motion";

// "How's it going with Bart?" A card that rises over My care: five stars, an optional note, and a
// line saying where it goes (anonymous, private, only to improve matching).

const WORDS = ["", "Not for me", "Not quite", "Okay", "Good", "Brilliant"];
const STAR =
  "M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z";

export function RatePractitioner({
  clinicianId,
  onClose,
}: {
  clinicianId: string;
  onClose: () => void;
}) {
  const c = getClinician(clinicianId);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(onClose, 1600);
    return () => clearTimeout(t);
  }, [sent, onClose]);

  if (!c) return null;
  const send = () => {
    sendPractitionerRating(c.id, stars, note);
    track("practitioner_rated", { stars, note: !!note.trim() });
    tap("save");
    setSent(true);
  };

  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim} accessibilityViewIsModal>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.bottom}
        >
          <Appear distance={120} style={styles.card}>
            {sent ? (
              <View style={styles.done} accessibilityLiveRegion="polite">
                <View style={styles.doneMark}>
                  <Burst fire={1} size={120} />
                  <View style={styles.doneCheck}>
                    <Icon name="icCheck" size={24} color={colors.white} />
                  </View>
                </View>
                <Text style={styles.title}>Thank you.</Text>
                <Text style={styles.sub}>This helps match people better.</Text>
              </View>
            ) : (
              <>
                <View style={styles.head}>
                  <Image
                    source={c.photo}
                    style={styles.photo}
                    contentFit="cover"
                    accessibilityLabel=""
                  />
                  <View style={styles.private}>
                    <Icon name="icLock" size={12} color={colors.muted} />
                    <Text style={styles.privateText}>Anonymous · private</Text>
                  </View>
                </View>
                <Text style={styles.title} accessibilityRole="header">
                  How’s it going with {c.firstName}?
                </Text>

                <View style={styles.stars} accessibilityRole="radiogroup">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <PressScale
                      key={n}
                      onPress={() => {
                        tap();
                        setStars(n);
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={`${n} star${n > 1 ? "s" : ""}, ${WORDS[n]}`}
                      accessibilityState={{ selected: stars === n }}
                      popOn={stars >= n}
                      scaleTo={0.8}
                      style={styles.star}
                    >
                      <Svg width={40} height={40} viewBox="0 0 24 24">
                        <Path
                          d={STAR}
                          fill={stars >= n ? colors.purple : "none"}
                          stroke={stars >= n ? colors.purple : colors.line}
                          strokeWidth={1.6}
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </PressScale>
                  ))}
                </View>
                <Text style={styles.word}>{stars ? WORDS[stars] : " "}</Text>

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  maxLength={NOTE_MAX}
                  multiline
                  placeholder="What they do really well, or what could be more neuro-affirming"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Feedback (optional)"
                  style={styles.input}
                />
                <Text style={styles.fine}>
                  Only used to improve matching. Never shown on profiles or
                  shared with {c.firstName}. Leave out names and health details.
                </Text>

                <PressDepth
                  onPress={send}
                  disabled={!stars}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !stars }}
                  radius={28}
                  lipColor={colors.purpleLip}
                  containerStyle={styles.sendWrap}
                  style={[styles.send, !stars && styles.sendOff]}
                >
                  <Text style={styles.sendText}>Send</Text>
                </PressDepth>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  style={styles.later}
                >
                  <Text style={styles.laterText}>Not now</Text>
                </Pressable>
              </>
            )}
          </Appear>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  bottom: { flex: 1, justifyContent: "flex-end" },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photo: { width: 56, height: 56, borderRadius: 28 },
  private: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  privateText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.black,
    marginTop: 14,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  stars: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  star: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  word: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.purpleText,
    textAlign: "center",
    marginTop: 4,
    minHeight: 20,
  },
  input: {
    marginTop: 14,
    minHeight: 88,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.black,
    textAlignVertical: "top",
  },
  fine: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 8,
  },
  sendWrap: { marginTop: 18 },
  send: {
    height: 56,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.4 },
  sendText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  later: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  laterText: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText },
  done: { alignItems: "center", paddingVertical: 20 },
  doneMark: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
});
