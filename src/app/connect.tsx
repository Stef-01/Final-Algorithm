import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FitLabel } from '@/components/FitLabel';
import { Icon } from '@/components/Icon';
import { Appear, Burst, PressDepth, PressScale, useReducedMotion } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useGoals } from '@/features/care/goals';
import { CLIENTS, MCP_URL, SHARES, useConnection, type Client, type Share } from '@/features/connect/connection';
import { buildConversation, snippet, type Turn } from '@/features/connect/demoChat';
import { track } from '@/lib/analytics';
import { localDay } from '@/lib/day';
import { tap } from '@/lib/haptics';
import { colors, fonts } from '@/lib/theme';

// Connect your AI (MCP). WATL is an MCP server at MCP_URL: add it to Claude or ChatGPT as a custom
// connector and the assistant can search WATL with what it already knows about you. These screens
// walk through that, then play an example chat that calls the real tool (find_professionals) on
// this device, so the results are exactly what the connector returns.

type Step = 'pick' | 'how' | 'connecting' | 'chat' | 'manage';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });

// react-native-web colours the "on" thumb separately.
const webThumb = { activeThumbColor: colors.white } as object;

const ASK = 'Find someone who understands the stress I’ve been going through with work.';

export default function Connect() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pick');
  const [client, setClient] = useState<Client>('claude');
  const [shares, setShares] = useState<Share[]>(['goals', 'practical', 'chats']);
  // Already connected: open on the summary.
  const { connection, save } = useConnection((c) => {
    setClient(c.client);
    setShares(c.shares);
    setStep('manage');
  });
  const { goals } = useGoals();

  const go = (s: Step) => {
    track('mcp_demo', { step: s, client });
    setStep(s);
  };
  const name = CLIENTS[client].name;
  const scroller = useRef<ScrollView>(null);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Connect your AI" onBack={step === 'how' ? () => go('pick') : () => router.back()} backLabel="Back" />
      <ScrollView
        ref={scroller}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        // The example chat grows as it plays: follow it.
        onContentSizeChange={() => step === 'chat' && scroller.current?.scrollToEnd({ animated: true })}
      >
        {step === 'pick' ? (
          <Appear key="pick" from="right" distance={40}>
            <Hero />
            <Text style={styles.h1}>Your AI already knows you.</Text>
            <Text style={styles.lead}>Let it find professionals who fit.</Text>
            <View style={styles.clients}>
              {(Object.keys(CLIENTS) as Client[]).map((c, i) => (
                <Appear key={c} index={i + 1} style={styles.fill}>
                  <PressDepth
                    onPress={() => {
                      tap();
                      setClient(c);
                      go('how');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Connect ${CLIENTS[c].name}`}
                    lipColor={colors.line}
                    style={styles.client}
                  >
                    <View style={[styles.clientMark, c === 'chatgpt' && styles.clientMarkAlt]}>
                      {c === 'claude' ? <Icon name="icSparkle" size={24} color={colors.white} /> : <Text style={styles.clientInitial}>GPT</Text>}
                    </View>
                    <Text style={styles.clientName}>{CLIENTS[c].name}</Text>
                    <Text style={styles.clientSub}>Connect</Text>
                  </PressDepth>
                </Appear>
              ))}
            </View>
          </Appear>
        ) : null}

        {step === 'how' ? (
          <Appear key="how" from="right" distance={40}>
            <Text style={styles.h1}>Three steps.</Text>
            <HowStep n={1} title={`Add WATL to ${name}`} index={0}>
              <Text style={styles.path}>{CLIENTS[client].steps.join('  ›  ')}</Text>
              <CopyUrl />
            </HowStep>
            <HowStep n={2} title="Choose what it can use" index={1}>
              {SHARES.map((s) => (
                <View key={s.id} style={styles.share}>
                  <View style={styles.fill}>
                    <Text style={styles.shareLabel}>{s.label}</Text>
                    <Text style={styles.shareSub}>{s.sub}</Text>
                  </View>
                  <Switch
                    value={shares.includes(s.id)}
                    onValueChange={(on) => setShares((x) => (on ? [...x, s.id] : x.filter((y) => y !== s.id)))}
                    trackColor={{ true: colors.purple, false: colors.line }}
                    thumbColor={colors.white}
                    {...webThumb}
                    accessibilityLabel={s.label}
                  />
                </View>
              ))}
            </HowStep>
            <HowStep n={3} title="Ask in your own words" index={2} last>
              <Text style={styles.quote}>“{ASK}”</Text>
            </HowStep>
            <Big label={`Connect ${name}`} onPress={() => go('connecting')} />
          </Appear>
        ) : null}

        {step === 'connecting' ? (
          <Connecting
            name={name}
            onDone={() => {
              save({ client, since: localDay(), shares });
              go('chat');
            }}
          />
        ) : null}

        {step === 'chat' ? <Chat key={shares.join()} name={name} turns={buildConversation(shares, goals)} onDone={() => go('manage')} /> : null}

        {step === 'manage' ? (
          <Appear key="manage" from="right" distance={40}>
            <View style={styles.connected}>
              <View style={styles.okDot}>
                <Icon name="icCheck" size={14} color={colors.white} />
              </View>
              <Text style={styles.connectedText}>Connected to {name}</Text>
            </View>
            <Text style={styles.kicker}>It can use</Text>
            <View style={styles.card}>
              {SHARES.map((s) => (
                <View key={s.id} style={styles.share}>
                  <Text style={[styles.shareLabel, styles.fill]}>{s.label}</Text>
                  <Switch
                    value={shares.includes(s.id)}
                    onValueChange={(on) => {
                      const next = on ? [...shares, s.id] : shares.filter((y) => y !== s.id);
                      setShares(next);
                      if (connection) save({ ...connection, shares: next });
                    }}
                    trackColor={{ true: colors.purple, false: colors.line }}
                    thumbColor={colors.white}
                    {...webThumb}
                    accessibilityLabel={s.label}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.kicker}>Connector</Text>
            <CopyUrl />
            <Text style={styles.kicker}>Tools</Text>
            <View style={styles.card}>
              <Tool name="find_professionals" sub="Ranks the network for you" />
              <Tool name="get_professional" sub="One profile, fees and availability" />
            </View>
            <Big label="See it in action" onPress={() => go('chat')} />
            <PressScale
              onPress={() => {
                save(null);
                setStep('pick');
              }}
              accessibilityRole="button"
              style={styles.link}
            >
              <Text style={styles.linkText}>Disconnect</Text>
            </PressScale>
            <Text style={styles.fine}>WATL doesn’t store what your AI sends. Remove the connector in {name} to stop it completely.</Text>
          </Appear>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Two marks joined by a pulsing line: your AI ↔ WATL. */
function Hero() {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  return (
    <View style={styles.hero} accessible={false}>
      <View style={[styles.heroMark, styles.heroAi]}>
        <Icon name="icSparkle" size={26} color={colors.white} />
      </View>
      <View style={styles.heroLine}>
        <Animated.View style={[styles.heroPulse, { left: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '85%'] }) }]} />
      </View>
      <View style={styles.heroMark}>
        <Text style={styles.heroW}>W</Text>
      </View>
    </View>
  );
}

function HowStep({ n, title, index, last, children }: { n: number; title: string; index: number; last?: boolean; children: React.ReactNode }) {
  return (
    <Appear index={index} style={styles.how}>
      <View style={styles.rail}>
        <View style={styles.num}>
          <Text style={styles.numText}>{n}</Text>
        </View>
        {last ? null : <View style={styles.railLine} />}
      </View>
      <View style={[styles.fill, styles.howBody]}>
        <Text style={styles.howTitle}>{title}</Text>
        {children}
      </View>
    </Appear>
  );
}

function CopyUrl() {
  const [copied, setCopied] = useState(0);
  return (
    <View style={styles.url}>
      <Text style={styles.urlText} selectable numberOfLines={1}>
        {MCP_URL}
      </Text>
      <PressScale
        onPress={() => {
          void Clipboard.setStringAsync(MCP_URL).catch(() => {});
          tap('save');
          setCopied((c) => c + 1);
        }}
        accessibilityRole="button"
        accessibilityLabel="Copy the connector URL"
        style={styles.copy}
        scaleTo={0.9}
      >
        <Burst fire={copied} size={56} count={8} />
        <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
      </PressScale>
    </View>
  );
}

function Tool({ name, sub }: { name: string; sub: string }) {
  return (
    <View style={styles.share}>
      <Text style={styles.toolName}>{name}</Text>
      <Text style={[styles.shareSub, styles.fill, styles.right]}>{sub}</Text>
    </View>
  );
}

function Big({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressDepth onPress={onPress} accessibilityRole="button" lipColor={colors.purpleText} containerStyle={styles.bigWrap} style={styles.big} radius={28}>
      <Text style={styles.bigText}>{label}</Text>
    </PressDepth>
  );
}

/** Three dots hopping in turn, then a check that pops with a burst. */
function Connecting({ name, onDone }: { name: string; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const dots = useState(() => [0, 1, 2].map(() => new Animated.Value(0)))[0];
  const pop = useState(() => new Animated.Value(0))[0];
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  });
  useEffect(() => {
    const hop = Animated.loop(
      Animated.stagger(
        140,
        dots.map((d) => Animated.sequence([Animated.spring(d, { toValue: 1, damping: 6, stiffness: 400, useNativeDriver: false }), Animated.spring(d, { toValue: 0, damping: 8, stiffness: 300, useNativeDriver: false })])),
      ),
    );
    if (!reduced) hop.start();
    const t1 = setTimeout(() => {
      hop.stop();
      setDone(true);
      tap('save');
      Animated.spring(pop, { toValue: 1, damping: 7, stiffness: 220, useNativeDriver: false }).start();
    }, reduced ? 200 : 1600);
    const t2 = setTimeout(() => finish.current(), reduced ? 600 : 2600);
    return () => {
      hop.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dots, pop, reduced]);
  return (
    <View style={styles.connecting} accessibilityLiveRegion="polite">
      <View style={styles.connectBox}>
        {done ? (
          <>
            <Burst fire={1} size={140} count={12} />
            <Animated.View style={[styles.bigCheck, { transform: [{ scale: pop }] }]}>
              <Icon name="icCheck" size={34} color={colors.white} />
            </Animated.View>
          </>
        ) : (
          <View style={styles.dots}>
            {dots.map((d, i) => (
              <Animated.View key={i} style={[styles.hop, { transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }]} />
            ))}
          </View>
        )}
      </View>
      <Text style={styles.h2}>{done ? `Connected to ${name}` : `Connecting to ${name}…`}</Text>
    </View>
  );
}

/** Reveals text a few characters at a time (all at once with reduced motion). */
function useTyped(text: string, start: boolean, cps = 60) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start || reduced) return;
    const id = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(id), x) : x + 2)), 1000 / (cps / 2));
    return () => clearInterval(id);
  }, [text, start, reduced, cps]);
  return reduced && start ? text : text.slice(0, n);
}

/** The example chat: each turn plays in order (Skip shows them all), then Done. */
function Chat({ name, turns, onDone }: { name: string; turns: Turn[]; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? turns.length : 1);
  const [all, setAll] = useState(reduced);
  const finished = all || shown > turns.length;
  return (
    <Appear key="chat" from="right" distance={40}>
      <View style={styles.chatHead}>
        <View style={[styles.okDot, styles.aiDot]}>
          <Icon name="icSparkle" size={12} color={colors.white} />
        </View>
        <Text style={styles.chatTitle}>{name}</Text>
        <Text style={styles.example}>Example chat</Text>
        {!finished ? (
          <PressScale
            onPress={() => {
              setAll(true);
              setShown(turns.length + 1);
            }}
            accessibilityRole="button"
            style={styles.skip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </PressScale>
        ) : null}
      </View>
      {turns.slice(0, Math.min(shown, turns.length)).map((t, i) => (
        <ChatTurn key={i} turn={t} instant={all} onDone={() => setShown((n) => Math.max(n, i + 2))} />
      ))}
      {finished ? (
        <Appear delay={300}>
          <Text style={styles.fine}>Every claim above is a reason WATL gave or a line quoted from the professional’s own profile.</Text>
          <Big label="Done" onPress={onDone} />
        </Appear>
      ) : null}
    </Appear>
  );
}

/**
 * One call to WATL, as a small bar ("WATL · find_professionals ✓"). Tap it to see what the
 * assistant used: what you said, and which earlier chats it drew on (title and date), plus the
 * request itself.
 */
function ToolCall({ turn, running }: { turn: Turn; running: boolean }) {
  const [open, setOpen] = useState(false);
  const said = turn.used.filter((u) => u.from !== 'Your chats');
  const chats = turn.used.filter((u) => u.from === 'Your chats');
  return (
    <Appear style={styles.toolCard}>
      <PressScale
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`WATL find professionals${running ? ', running' : ''}. ${open ? 'Hide' : 'Show'} what it used`}
        style={styles.toolRow}
        scaleTo={0.98}
      >
        <View style={styles.toolW}>
          <Text style={styles.toolWText}>W</Text>
        </View>
        <Text style={styles.toolTitle}>WATL · find_professionals</Text>
        {running ? <Text style={styles.running}>running</Text> : <Icon name="icCheck" size={14} color={colors.purpleText} />}
        <Icon name="icDownArrow" size={10} color={colors.muted} style={open ? styles.flip : undefined} />
      </PressScale>
      {open ? (
        <Appear distance={6}>
          {said.map((u) => (
            <View key={u.label} style={styles.usedRow}>
              <Text style={styles.usedFrom}>{u.from}</Text>
              <Text style={styles.usedLabel}>{u.label}</Text>
            </View>
          ))}
          {chats.length ? <Text style={[styles.usedFrom, styles.chatsHead]}>Your chats</Text> : null}
          {chats.map((u) => (
            <View key={u.label} style={styles.chatRow}>
              <Icon name="icText" size={14} color={colors.purpleText} />
              <View style={styles.fill}>
                <View style={styles.chatTop}>
                  <Text style={styles.chatTitle2} numberOfLines={1}>
                    {u.chat?.title}
                  </Text>
                  <Text style={styles.chatDate}>{u.chat?.date}</Text>
                </View>
                <Text style={styles.chatUsed}>{u.label}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.args} selectable>
            {JSON.stringify(turn.args)}
          </Text>
        </Appear>
      ) : null}
    </Appear>
  );
}

function ChatTurn({ turn, instant, onDone }: { turn: Turn; instant: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState(instant ? 4 : 0);
  const p = instant ? 4 : phase;
  const asked = useTyped(turn.ask, true, 110);
  const said = useTyped(turn.reply, p >= 4, 160);
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  });
  // Each step waits for the one before: the message finishes typing, WATL runs, results land,
  // the reply finishes typing, and only then does the next message start.
  const typedAsk = asked.length === turn.ask.length;
  const typedReply = said.length === turn.reply.length;
  useEffect(() => {
    if (instant) return;
    if (p === 0 && typedAsk) {
      const t = setTimeout(() => setPhase(1), 350);
      return () => clearTimeout(t);
    }
    if (p > 0 && p < 4) {
      const t = setTimeout(() => setPhase(p + 1), 850);
      return () => clearTimeout(t);
    }
    if (p === 4 && typedReply) {
      const t = setTimeout(() => finish.current(), 1100);
      return () => clearTimeout(t);
    }
  }, [instant, p, typedAsk, typedReply]);

  return (
    <View style={styles.turn}>
      <Appear style={styles.userBubble}>
        <Text style={styles.userText}>{instant ? turn.ask : asked}</Text>
      </Appear>

      {p >= 1 ? <ToolCall turn={turn} running={p < 3} /> : null}

      {p >= 3
        ? turn.results.slice(0, 3).map((r, i) => {
            const c = getClinician(r.id);
            const m = r.profile_mentions?.[0];
            return (
              <Appear key={r.id} index={i}>
                <PressScale onPress={() => router.push(`/clinician/${r.id}`)} accessibilityRole="button" accessibilityLabel={`${r.name}, ${r.fit}`} style={styles.result} scaleTo={0.98}>
                  {c ? <Image source={c.photo} style={styles.resultPhoto} contentFit="cover" accessibilityLabel="" /> : null}
                  <View style={styles.fill}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.resultWhy} numberOfLines={2}>
                      {m ? `“${snippet(m.quote, m.phrase, 5)}”` : (r.why[0]?.evidence ?? r.where)}
                    </Text>
                  </View>
                  <FitLabel fit={r.fit} />
                </PressScale>
              </Appear>
            );
          })
        : null}

      {p >= 4 ? (
        <Appear style={styles.aiBubble}>
          <Text style={styles.aiText}>{instant ? turn.reply : said}</Text>
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  fill: { flex: 1 },
  right: { textAlign: 'right' },
  h1: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 36, color: colors.black, marginTop: 12 },
  h2: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 28, color: colors.black, textAlign: 'center', marginTop: 24 },
  lead: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, marginTop: 6 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8, gap: 10 },
  heroMark: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  heroAi: { backgroundColor: colors.black },
  heroW: { fontFamily: fonts.serifSemiBold, fontSize: 30, color: colors.black },
  heroLine: { width: 90, height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  heroPulse: { position: 'absolute', top: 0, width: 14, height: 3, borderRadius: 2, backgroundColor: colors.purple },
  clients: { flexDirection: 'row', gap: 12, marginTop: 24 },
  client: { backgroundColor: colors.white, padding: 18, alignItems: 'center', minHeight: 150, justifyContent: 'center', borderWidth: 2, borderColor: colors.line },
  clientMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#C96442', alignItems: 'center', justifyContent: 'center' },
  clientMarkAlt: { backgroundColor: colors.black },
  clientInitial: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  clientName: { fontFamily: fonts.bold, fontSize: 17, color: colors.black, marginTop: 12 },
  clientSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.purpleText, marginTop: 2 },
  how: { flexDirection: 'row', gap: 14, marginTop: 20 },
  rail: { alignItems: 'center', width: 32 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  railLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 6 },
  howBody: { paddingBottom: 4 },
  howTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.black, marginTop: 5, marginBottom: 10 },
  path: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginBottom: 10 },
  url: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 14, paddingLeft: 14, paddingRight: 6, minHeight: 52 },
  urlText: { flex: 1, fontFamily: MONO, fontSize: 13, color: colors.black },
  copy: { minWidth: 76, height: 40, borderRadius: 20, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  copyText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  share: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  shareLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  shareSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  quote: { fontFamily: fonts.serifSemiBold, fontSize: 18, lineHeight: 25, color: colors.black },
  bigWrap: { marginTop: 28 },
  big: { height: 56, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  bigText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  connecting: { alignItems: 'center', paddingTop: 80 },
  connectBox: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 10 },
  hop: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.purple },
  bigCheck: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  okDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  aiDot: { backgroundColor: colors.black },
  connectedText: { fontFamily: fonts.serifSemiBold, fontSize: 24, color: colors.black },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 14 },
  toolName: { fontFamily: MONO, fontSize: 13, color: colors.black },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 16 },
  turn: { marginBottom: 18 },
  skip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.white, marginLeft: 8 },
  skipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.purpleText },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 14 },
  chatTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.black, flex: 1 },
  example: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  userBubble: { alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: colors.black, borderRadius: 20, borderBottomRightRadius: 6, padding: 14, minHeight: 48 },
  userText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.white },
  toolCard: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12, borderWidth: 1, borderColor: colors.line },
  flip: { transform: [{ rotate: '180deg' }] },
  usedRow: { marginTop: 10 },
  chatsHead: { marginTop: 12 },
  chatRow: { flexDirection: 'row', gap: 8, marginTop: 8, backgroundColor: '#F6F0F5', borderRadius: 10, padding: 10 },
  chatTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  chatTitle2: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  chatDate: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  chatUsed: { fontFamily: fonts.regular, fontSize: 13, color: colors.black, marginTop: 2 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolW: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  toolWText: { fontFamily: fonts.serifSemiBold, fontSize: 13, color: colors.black },
  toolTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  running: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  usedFrom: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  usedLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  args: { fontFamily: MONO, fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 10 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 12, marginTop: 10 },
  resultPhoto: { width: 48, height: 48, borderRadius: 24 },
  resultName: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  resultWhy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  aiBubble: { alignSelf: 'flex-start', maxWidth: '92%', marginTop: 14, backgroundColor: colors.white, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14 },
  aiText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.black },
});
