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
