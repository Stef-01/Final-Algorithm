import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { professionals } from '@server/data/professionals';

import { signalsFor } from '@/features/match/agent';
import { activeCount, applyFilters, currentValues } from '@/features/match/filters';
import * as core from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const byId = new Map(professionals.map((c) => [c.id, c]));
const all = (s: core.SessionState) => (s.result?.status === 'matches' ? [...s.result.matches, ...s.result.more] : []);

describe('filters (the old Preferences screen, for health)', () => {
  const base = { clinicalNeeds: [], preferences: {}, constraints: { mode: 'telehealth_only' as const, maxGap: 0 } };

  it('each filter sets or lifts one requirement, overriding what the words set', () => {
    expect(applyFilters(base, { mode: 'any' }).constraints.mode).toBe('any');
    expect(applyFilters(base, { cost: 'any' }).constraints.maxGap).toBeNull();
    expect(applyFilters(base, { gender: 'female' }).constraints.clinicianGender).toBe('female');
    expect(applyFilters(base, { near: 'perth' }).constraints).toMatchObject({ originLabel: 'Perth', maxKm: 50 });
    expect(applyFilters(base, { near: 'perth', distance: 15 }).constraints.maxKm).toBe(15);
    expect(applyFilters(base, { language: 'Hindi' }).constraints.languages).toEqual(['Hindi']);
    expect(applyFilters(base, { wheelchair: 'yes' }).constraints.accessibility).toEqual(['wheelchair']);
    expect(applyFilters(base, undefined)).toBe(base);
  });

  it('shows what the search already had, and counts what narrows it', () => {
    expect(currentValues(base)).toMatchObject({ mode: 'telehealth_only', cost: 'bulk', gender: 'any' });
    expect(activeCount(base)).toBe(2);
    expect(activeCount(applyFilters(base, { mode: 'any', cost: 'any' }))).toBe(0);
  });

  it('re-ranks the search: only people who meet a filter remain', () => {
    const s0 = core.demoResults('psych-masking');
    const hindi = core.setFilters(s0, { language: 'Hindi' }).state;
    for (const m of all(hindi)) expect(byId.get(m.clinicianId)!.practical.languages).toContain('Hindi');
    const wheel = core.setFilters(s0, { wheelchair: 'yes' }).state;
    expect(all(wheel).length).toBeGreaterThan(0);
    for (const m of all(wheel)) expect(byId.get(m.clinicianId)!.practical.accessibility).toContain('wheelchair');
    expect(core.countWithFilters(s0, { wheelchair: 'yes' })).toBe(all(wheel).length);
  });

  it('lifting what the words set widens the list', () => {
    const s0 = core.demoResults('psych-trauma-online'); // said "online only"
    const n0 = all(s0).length;
    expect(signalsFor(s0.input).constraints.mode).toBe('telehealth_only');
    expect(core.countWithFilters(s0, { mode: 'any' })).toBeGreaterThan(n0);
  });
});

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  filters: require('@/app/filters').default,
};

describe('Filters screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_session', JSON.stringify({ ...core.demoResults('psych-masking'), updatedAt: Date.now() }));
  });

  it('opens from the matches, shows a live count, and applies', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('Filters'));
    fireEvent.press(await screen.findByLabelText('Appointments: Open to all'));
    fireEvent.press(screen.getByLabelText('Appointments: Telehealth'));
    const expected = core.countWithFilters(core.demoResults('psych-masking'), { mode: 'telehealth_only' });
    fireEvent.press(await screen.findByText(`Show ${expected}`));
    expect(await screen.findByLabelText('Filters, 1 on')).toBeOnTheScreen();
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('watl_session'))!).input.filters).toEqual({ mode: 'telehealth_only' }));
  });

  it('distance waits for somewhere to measure from', async () => {
    renderRouter(routes, { initialUrl: '/filters' });
    expect(await screen.findByLabelText('Distance: pick Near first')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Near: Anywhere'));
    fireEvent.press(screen.getByLabelText('Near: Brisbane'));
    expect(await screen.findByLabelText('Distance: 50 km')).toBeOnTheScreen();
  });
});

describe('swiping a match (through the screen-reader actions, which drive the same fly-off)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_session', JSON.stringify({ ...core.demoResults('psych-trauma-online'), updatedAt: Date.now() }));
  });

  it('save saves and moves on; pass just moves on', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    const deck = () => screen.UNSAFE_root.findAll((n) => Array.isArray(n.props.accessibilityActions) && n.props.accessibilityActions.some((a: { name: string }) => a.name === 'save'))[0];
    await screen.findAllByText('Alice Bui');
    fireEvent(deck(), 'accessibilityAction', { nativeEvent: { actionName: 'save' } });
    await waitFor(async () => expect((await AsyncStorage.getItem('watl_saved')) ?? '').toContain('alice-bui'));
    expect(await screen.findByLabelText('Previous match')).toBeOnTheScreen();
    fireEvent(deck(), 'accessibilityAction', { nativeEvent: { actionName: 'pass' } });
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('watl_session'))!).index).toBe(2));
    expect(JSON.parse((await AsyncStorage.getItem('watl_saved'))!)).toHaveLength(1);
  });
});
