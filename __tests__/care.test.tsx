import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { restoreGoals } from '@/features/care/goals';
import { bookingPlan, careTeam, type TeamMember } from '@/features/care/plan';
import { googleCalendarUrl, icsFor } from '@/lib/calendar';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const jess: TeamMember = { clinicianId: 'jessica-katsamatsas', profession: 'psychologist', name: 'Jessica Katsamatsas', firstName: 'Jess', bookingUrl: 'https://example.com/jess' };
const anu: TeamMember = { clinicianId: 'anu-saxena', profession: 'gp', name: 'Dr Anu Saxena', firstName: 'Anu', bookingUrl: null };

describe('care team', () => {
  it('fills a slot for each goal nobody saved covers, in the order care usually starts', () => {
    const team = careTeam([jess], ['organised', 'medication']);
    expect(team.map((s) => [s.profession, s.member?.firstName])).toEqual([
      ['gp', undefined],
      ['psychologist', 'Jess'],
      ['adhd_coach', undefined],
    ]);
  });

  it('a goal already covered by someone saved adds nothing', () => {
    expect(careTeam([jess], ['stress']).map((s) => s.profession)).toEqual(['psychologist']);
  });

  it("shows professions the network doesn't have yet, so they can be planned for", () => {
    expect(careTeam([], ['eat']).map((s) => s.profession)).toEqual(['dietitian']);
  });
});

describe('booking plan', () => {
  const monday = new Date(2026, 8, 28, 12); // Mon 28 Sep 2026
  it('suggests the GP first, then two weeks apart, always on a weekday', () => {
    const steps = bookingPlan(careTeam([jess, anu], []), monday);
    expect(steps.map((s) => s.member.firstName)).toEqual(['Anu', 'Jess']);
    expect(steps.map((s) => s.on.toDateString())).toEqual(['Wed Sep 30 2026', 'Wed Oct 14 2026']);
    expect(steps.map((s) => s.label)).toEqual(['This week', 'In 2 weeks']);
    for (const s of steps) expect([0, 6]).not.toContain(s.on.getDay());
  });

  it('moves a weekend reminder to Monday', () => {
    const thursday = new Date(2026, 9, 1, 12);
    expect(bookingPlan(careTeam([anu], []), thursday)[0].on.getDay()).toBe(1);
  });
});

describe('calendar reminders', () => {
  const e = { title: 'Book Jess, psychologist; soon', start: new Date(Date.UTC(2026, 8, 30, 23, 0)), minutes: 15, details: 'Line one\nLine two', url: 'https://example.com/jess' };

  it('writes a valid, escaped .ics event', () => {
    const ics = icsFor(e, 'uid-1');
    expect(ics).toContain('BEGIN:VEVENT\r\nUID:uid-1');
    expect(ics).toContain('DTSTART:20260930T230000Z');
    expect(ics).toContain('DTEND:20260930T231500Z');
    expect(ics).toContain('SUMMARY:Book Jess\\, psychologist\\; soon');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\\nhttps://example.com/jess');
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
  });

  it('prefills Google Calendar with the same times', () => {
    const u = new URL(googleCalendarUrl(e));
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('dates')).toBe('20260930T230000Z/20260930T231500Z');
    expect(u.searchParams.get('details')).toContain('https://example.com/jess');
  });
});

describe('goals', () => {
  it('keeps known goals only, once each', () => {
    expect(restoreGoals(['sleep', 'sleep', 'fly to the moon', 3])).toEqual(['sleep']);
    expect(restoreGoals({})).toEqual([]);
  });

  it('picking a goal adds a slot to My care', async () => {
    await AsyncStorage.clear();
    /* eslint-disable @typescript-eslint/no-require-imports */
    renderRouter(
      {
        _layout: require('@/app/_layout'),
        '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
        '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
        '(tabs)/(find)/index': () => null,
        '(tabs)/saved': require('@/app/(tabs)/saved').default,
        '(tabs)/settings': require('@/app/(tabs)/settings').default,
      },
      { initialUrl: '/settings' },
    );
    fireEvent.press(await screen.findByLabelText('Get organised'));
    expect(screen.getByLabelText('Get organised').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(screen.getByLabelText('My care'));
    expect(await screen.findByLabelText('Add an ADHD coach')).toBeOnTheScreen();
  });
});

describe('goals shape a search', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const core = require('@/features/match/sessionCore') as typeof import('@/features/match/sessionCore');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signalsFor } = require('@/features/match/agent') as typeof import('@/features/match/agent');

  it('a goal adds a low-confidence need, and the reason says it came from the goal', () => {
    const t = core.submitText(core.chooseProfession(core.initialState(), 'adhd_coach').state, 'I need some help', null, ['organised']);
    const need = signalsFor(t.state.input).clinicalNeeds.find((n) => n.area === 'Executive functioning');
    expect(need).toMatchObject({ confidence: 'low', goal: 'Get organised' });
    const r = core.match(t.state).state.result;
    if (r?.status !== 'matches') throw new Error('expected matches');
    expect(r.matches[0].reasons[0].signal).toBe('Your goal: get organised.');
  });

  it("doesn't add what the patient already said, and demos ignore goals", () => {
    const said = core.submitText(core.chooseProfession(core.initialState(), 'adhd_coach').state, 'I procrastinate and cannot get organised', null, ['organised']);
    expect(signalsFor(said.state.input).clinicalNeeds.filter((n) => n.area === 'Executive functioning')).toHaveLength(1);
    expect(signalsFor(said.state.input).clinicalNeeds.find((n) => n.area === 'Executive functioning')!.goal).toBeUndefined();
  });
});

describe('My care: removing someone', () => {
  it('the heart on a team card takes them off the team, back to Liked', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_saved', JSON.stringify([{ clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-26', team: true }]));
    /* eslint-disable @typescript-eslint/no-require-imports */
    renderRouter(
      {
        _layout: require('@/app/_layout'),
        '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
        '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
        '(tabs)/(find)/index': () => null,
        '(tabs)/saved': require('@/app/(tabs)/saved').default,
        '(tabs)/settings': () => null,
      },
      { initialUrl: '/saved' },
    );
    expect(await screen.findByText('Book Alice')).toBeOnTheScreen();
    fireEvent.press(await screen.findByLabelText('Remove Alice from your team'));
    expect(await screen.findByLabelText('Unlike Alice')).toBeOnTheScreen();
    expect(screen.queryByText('Book Alice')).toBeNull();
    fireEvent.press(screen.getByLabelText('Unlike Alice'));
    expect(await screen.findByText('Build your care team.')).toBeOnTheScreen();
    expect(JSON.parse((await AsyncStorage.getItem('watl_saved'))!)).toEqual([]);
  });
});

describe('starting a search from your team', () => {
  it('prefills the words from the goals that profession helps with', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { goalsDraft } = require('@/features/care/plan') as typeof import('@/features/care/plan');
    expect(goalsDraft('gp', ['medication', 'sleep', 'move'])).toBe("I'd like help to: review medication, sleep better.");
    expect(goalsDraft('adhd_coach', ['medication'])).toBeUndefined();
  });

  it('"Add a GP" opens the search with those words ready', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_goals', JSON.stringify(['medication']));
    /* eslint-disable @typescript-eslint/no-require-imports */
    renderRouter(
      {
        _layout: require('@/app/_layout'),
        '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
        '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
        '(tabs)/(find)/index': () => null,
        '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
        '(tabs)/(find)/where': require('@/app/(tabs)/(find)/where').default,
        '(tabs)/saved': require('@/app/(tabs)/saved').default,
        '(tabs)/settings': () => null,
      },
      { initialUrl: '/saved' },
    );
    fireEvent.press(await screen.findByLabelText('Add a GP'));
    fireEvent.press(await screen.findByLabelText('Anywhere: Telehealth is fine'));
    expect((await screen.findByLabelText("What you're looking for")).props.value).toBe("I'd like help to: review medication.");
  });
});
