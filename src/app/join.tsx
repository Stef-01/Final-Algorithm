import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Kicker } from '@/components/cards';
import { Appear, PressScale } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { API_BASE } from '@/features/match/remoteExtract';
import { track } from '@/lib/analytics';
import { capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Join WATL: for professionals, to publish what profiles usually leave out. Same rule as the
// interview: every number needs your own words behind it. A person reviews it before anything shows.

type Tri = boolean | null;

const PROBLEM: Record<string, string> = {
  name: 'Your name',
  email: 'An email we can reach you on',
  profession: 'Pick your profession',
  practice: 'Your practice',
  consent: 'Tick the agreement',
  fee: 'Fee: a number',
  gap: 'Out of pocket: a number',
  waitDays: 'Wait: a number of days',
  'fee-words': 'Put your fee in your words too',
  'waitDays-words': 'Put the wait in your words too',
  'gap-over-fee': 'Out of pocket can’t be more than the fee',
  inTheirWords: 'Say it in your own words',
};

export default function Join() {
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({ name: '', email: '', practice: '', suburb: '', fee: '', gap: '', waitDays: '', inTheirWords: '', decisions: '', betweenVisits: '' });
  const [profession, setProfession] = useState<string | null>(null);
  const [tri, setTri] = useState<{ weekends: Tri; telehealth: Tri; newPatients: Tri }>({ weekends: null, telehealth: null, newPatients: null });
  const [consent, setConsent] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [state, setState] = useState<'editing' | 'sending' | 'done' | 'offline'>('editing');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    if (API_BASE === null) return setState('offline');
    setState('sending');
    try {
      const r = await fetch(`${API_BASE}/api/portal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, profession, consent, facts: { fee: f.fee, gap: f.gap, waitDays: f.waitDays, ...tri } }),
      });
      if (r.status === 400) {
        setProblems(((await r.json()) as { problems?: string[] }).problems ?? []);
        return setState('editing');
      }
      track('portal_submitted', { profession: profession ?? '' });
      setState(r.ok || r.status === 202 ? 'done' : 'offline');
    } catch {
      setState('offline');
    }
  };

  if (state === 'done' || state === 'offline') {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Join WATL" back />
        <Appear style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name={state === 'done' ? 'icCheck' : 'icClose'} size={28} color={colors.white} />
          </View>
          <Text style={styles.doneTitle}>{state === 'done' ? 'Thanks. We’ll review it and be in touch.' : 'Couldn’t send that. Try again online.'}</Text>
        </Appear>
      </View>
    );
  }

  const has = (p: string) => problems.includes(p);
  const field = (label: string, key: keyof typeof f, opts: { problem?: string[]; keyboard?: 'email-address' | 'number-pad'; multiline?: boolean; placeholder?: string } = {}) => {
    const bad = (opts.problem ?? [key]).find(has);
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={f[key]}
          onChangeText={set(key)}
          keyboardType={opts.keyboard}
          autoCapitalize={opts.keyboard === 'email-address' ? 'none' : 'sentences'}
          multiline={opts.multiline}
          placeholder={opts.placeholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          style={[styles.input, opts.multiline && styles.area, !!bad && styles.inputBad]}
        />
        {bad ? <Text style={styles.problem}>{PROBLEM[bad]}</Text> : null}
      </View>
    );
  };
  const toggle = (label: string, key: keyof typeof tri) => (
    <View style={styles.triRow}>
      <Text style={styles.triLabel}>{label}</Text>
      {([true, false] as const).map((v) => (
        <PressScale
          key={String(v)}
          onPress={() => setTri((t) => ({ ...t, [key]: t[key] === v ? null : v }))}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${v ? 'yes' : 'no'}`}
          accessibilityState={{ selected: tri[key] === v }}
          style={[styles.pill, tri[key] === v && styles.pillOn]}
          scaleTo={0.94}
        >
          <Text style={[styles.pillText, tri[key] === v && styles.pillTextOn]}>{v ? 'Yes' : 'No'}</Text>
        </PressScale>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScreenHeader title="Join WATL" back />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Publish what patients ask first. We review everything before it shows.</Text>

        <Kicker label="You" style={styles.kicker} />
        {field('Name', 'name')}
        {field('Email', 'email', { keyboard: 'email-address' })}
        <View style={styles.field}>
          <Text style={styles.label}>Profession</Text>
          <View style={styles.chips}>
            {PROFESSION_INFO.filter((p) => p.available).map((p) => (
              <PressScale
                key={p.id}
                onPress={() => setProfession(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: profession === p.id }}
                style={[styles.pill, profession === p.id && styles.pillOn]}
                scaleTo={0.94}
              >
                <Text style={[styles.pillText, profession === p.id && styles.pillTextOn]}>{capitalised(p.one)}</Text>
              </PressScale>
            ))}
          </View>
          {has('profession') ? <Text style={styles.problem}>{PROBLEM.profession}</Text> : null}
        </View>
        {field('Practice', 'practice')}
        {field('Suburb', 'suburb')}

        <Kicker label="Fees and availability" style={styles.kicker} />
        <View style={styles.row3}>
          <View style={styles.third}>{field('Fee ($)', 'fee', { keyboard: 'number-pad', problem: ['fee', 'fee-words'] })}</View>
          <View style={styles.third}>{field('Out of pocket ($)', 'gap', { keyboard: 'number-pad', problem: ['gap', 'gap-over-fee'] })}</View>
          <View style={styles.third}>{field('Wait (days)', 'waitDays', { keyboard: 'number-pad', problem: ['waitDays', 'waitDays-words'] })}</View>
        </View>
        {toggle('Weekends', 'weekends')}
        {toggle('Telehealth', 'telehealth')}
        {toggle('New patients', 'newPatients')}
        {field('In your words', 'inTheirWords', {
          multiline: true,
          placeholder: 'e.g. Sessions are $220; with a GP plan the gap is about $91. New patients wait about 7 days.',
        })}

        <Kicker label="How you work (optional)" style={styles.kicker} />
        {field('How do you make decisions with patients?', 'decisions', { multiline: true })}
        {field('What happens between appointments?', 'betweenVisits', { multiline: true })}

        <PressScale
          onPress={() => setConsent((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={styles.consent}
          scaleTo={0.98}
        >
          <View style={[styles.box, consent && styles.boxOn]}>{consent ? <Icon name="icCheck" size={14} color={colors.white} /> : null}</View>
          <Text style={styles.consentText}>WATL may show this on my profile after review, and contact me about it.</Text>
        </PressScale>
        {has('consent') ? <Text style={styles.problem}>{PROBLEM.consent}</Text> : null}

        <PressScale onPress={submit} disabled={state === 'sending'} accessibilityRole="button" style={styles.submit} scaleTo={0.97}>
          <Text style={styles.submitText}>{state === 'sending' ? 'Sending…' : 'Send for review'}</Text>
        </PressScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  lead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.black },
  kicker: { marginHorizontal: 0, marginTop: 22 },
  field: { marginBottom: 12 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.black, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.black,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  area: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  inputBad: { borderColor: colors.black },
  problem: { fontFamily: fonts.bold, fontSize: 13, color: colors.black, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, backgroundColor: colors.white },
  pillOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  pillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  pillTextOn: { color: colors.white },
  row3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  third: { flexGrow: 1, flexBasis: 96 },
  triRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  triLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.black, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  consentText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black },
  submit: { marginTop: 20, height: 56, borderRadius: 28, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 28, color: colors.black, textAlign: 'center' },
});
