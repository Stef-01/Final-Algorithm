import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { demoById } from '@/features/match/demos';
import { setAnalyticsSender, track } from '@/lib/analytics';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

type Sent = { name: string; props: Record<string, string | number | boolean> };
let sent: Sent[] = [];
beforeEach(async () => {
  sent = [];
  setAnalyticsSender((name, props) => sent.push({ name, props }));
  await AsyncStorage.clear();
});
afterAll(() => setAnalyticsSender(null));

describe('track()', () => {
  it('sends short identifiers and numbers, never free text', () => {
    track('clinician_viewed', { clinician: 'paula-garrido', fit: 'Strong fit' });
    track('followup_answered', { question: "I'd rather we talk it through, honestly it's been a hard year", ownWords: true } as never);
    expect(sent[0]).toEqual({ name: 'clinician_viewed', props: { clinician: 'paula-garrido', fit: 'Strong fit' } });
    expect(sent[1].props).toEqual({ ownWords: true });
  });

  it('does nothing without a sender (native apps)', () => {
    setAnalyticsSender(null);
    expect(() => track('voice_started', {})).not.toThrow();
    expect(sent).toEqual([]);
  });

  it('never lets analytics break the flow', () => {
    setAnalyticsSender(() => {
      throw new Error('blocked by an ad blocker');
    });
    expect(() => track('voice_started', {})).not.toThrow();
  });
});

describe('events through a run-through (PRD §48)', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const routes = {
    _layout: require('@/app/_layout').default,
    '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
    '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
    '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
    '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
    '(tabs)/(find)/demos': require('@/app/(tabs)/(find)/demos').default,
    '(tabs)/(find)/clarify': require('@/app/(tabs)/(find)/clarify').default,
    '(tabs)/(find)/confirm': require('@/app/(tabs)/(find)/confirm').default,
    '(tabs)/(find)/matching': require('@/app/(tabs)/(find)/matching').default,
    '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
    '(tabs)/saved': () => null,
    '(tabs)/settings': () => null,
    'clinician/[id]': require('@/app/clinician/[id]').default,
    'book/[id]': require('@/app/book/[id]').default,
  };

  it('records the journey from description to booking and feedback', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Try a demo patient'));
    fireEvent.press(await screen.findByText('Burnt out from masking'));
    fireEvent.press(await screen.findByLabelText('Next'));
    fireEvent.press(await screen.findByText('Explain them and decide together'));
    fireEvent.press(await screen.findByText('Find my matches'));
    await screen.findByText('Jessica Katsamatsas');

    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('View Jess'));
    fireEvent.press(await screen.findByText('Book with Jess'));
    fireEvent.press(await screen.findByText('Open booking page'));
    await waitFor(() => expect(sent.some((e) => e.name === 'booking_clicked')).toBe(true));

    const names = sent.map((e) => e.name);
    for (const n of [
      'text_submitted',
      'matching_started',
      'followup_asked',
      'followup_answered',
      'matching_completed',
      'match_feedback_positive',
      'clinician_viewed',
      'booking_clicked',
    ]) {
      expect(names).toContain(n);
    }
    const done = sent.find((e) => e.name === 'matching_completed')!.props;
    expect(done).toMatchObject({ followups: 1, profession: 'psychologist' });
    expect(typeof done.seconds).toBe('number');
    expect(sent.find((e) => e.name === 'matching_started')!.props).toEqual({ profession: 'psychologist', demo: true });

    // Nothing the patient said ever leaves the device in an event.
    const words = demoById('psych-masking')!.text.toLowerCase().match(/[a-z']{5,}/g)!;
    for (const e of sent) {
      for (const v of Object.values(e.props)) {
        if (typeof v === 'string') for (const w of words) expect(v.toLowerCase()).not.toContain(w);
      }
    }
  });

  it('records next-match views and the 1–5 rating', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Try a demo patient'));
    fireEvent.press(await screen.findByText('Trauma, online sessions only'));
    fireEvent.press(await screen.findByLabelText('Next'));
    await screen.findByText('Alice Bui');
    for (let i = 0; i < 3; i++) fireEvent.press(screen.getByLabelText('Next match'));
    fireEvent.press(await screen.findByLabelText('4 out of 5, Well'));
    expect(await screen.findByText('Thanks for telling us.')).toBeOnTheScreen();
    expect(sent.filter((e) => e.name === 'next_match_viewed').map((e) => e.props.position)).toEqual([2, 3, 4]);
    expect(sent.find((e) => e.name === 'match_rating')!.props).toEqual({ rating: 4, matches: 3 });
  });
});
