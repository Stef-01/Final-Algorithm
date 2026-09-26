/**
 * Every button does something. For each main screen, press each button, link, checkbox, radio,
 * switch and tab once (on a fresh render) and check something happened: the route changed, the
 * screen changed, or a link, clipboard or calendar call went out. Catches dead buttons.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Linking } from 'react-native';

import { demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
// The phone's calendar: permission refused for reminders (so they fall back to Google Calendar), and
// an empty calendar for "both free".
jest.mock('@/lib/deviceCalendar', () => ({ addToDeviceCalendar: async () => false, busyTimes: async () => [] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/where': require('@/app/(tabs)/(find)/where').default,
  '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
  '(tabs)/(find)/demos': require('@/app/(tabs)/(find)/demos').default,
  '(tabs)/(find)/discover': require('@/app/(tabs)/(find)/discover').default,
  '(tabs)/(find)/all': require('@/app/(tabs)/(find)/all').default,
  '(tabs)/(find)/clarify': require('@/app/(tabs)/(find)/clarify').default,
  '(tabs)/(find)/confirm': require('@/app/(tabs)/(find)/confirm').default,
  '(tabs)/(find)/matching': require('@/app/(tabs)/(find)/matching').default,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': require('@/app/(tabs)/saved').default,
  '(tabs)/settings': require('@/app/(tabs)/settings').default,
  'clinician/[id]': require('@/app/clinician/[id]').default,
  'book/[id]': require('@/app/book/[id]').default,
  connect: require('@/app/connect').default,
  filters: require('@/app/filters').default,
  join: require('@/app/join').default,
  rate: require('@/app/rate').default,
  refine: require('@/app/refine').default,
  safety: require('@/app/safety').default,
};

/** The current route (expo-router's testing screen adds getPathname). */
const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();

const ROLES = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab'] as const;
const today = new Date().toISOString().slice(0, 10);

async function seed() {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('watl_session', JSON.stringify({ ...demoResults('psych-trauma-online'), updatedAt: Date.now() }));
  await AsyncStorage.setItem(
    'watl_saved',
    JSON.stringify([
      { clinicianId: 'paula-garrido', fit: 'Good fit', savedAt: today, team: true, visits: [today] },
      { clinicianId: 'alice-bui', fit: 'Good fit', savedAt: today },
    ]),
  );
  await AsyncStorage.setItem('watl_plans', JSON.stringify(['mental']));
  await AsyncStorage.setItem('watl_rate_asked', JSON.stringify({ 'paula-garrido': today }));
}

// Flush effects, storage reads and navigation (several rounds of microtasks).
const settle = async () => {
  for (let i = 0; i < 12; i++) await act(async () => {});
};

/** Every enabled control on the screen, as [role, label] pairs in order. */
function controls() {
  return ROLES.flatMap((role) =>
    screen
      .queryAllByRole(role)
      .filter((n) => !n.props.accessibilityState?.disabled && !n.props['aria-disabled'])
      .map((n, i) => ({ role, i, label: String(n.props.accessibilityLabel ?? n.props['aria-label'] ?? '') })),
  );
}

async function open(url: string) {
  renderRouter(routes, { initialUrl: url });
  await settle();
  await settle();
}

const SCREENS: [string, string][] = [
  ['Home', '/'],
  ['Where', '/where'],
  ['Describe', '/describe'],
  ['Matches', '/matches'],
  ['All who fit', '/all'],
  ['Profile page', '/clinician/paula-garrido'],
  ['My care', '/saved'],
  ['Profile tab', '/settings'],
  ['Filters', '/filters'],
  ['Connect', '/connect'],
  ['Rate', '/rate?n=5'],
  ['Booking', '/book/paula-garrido'],
  ['Join', '/join'],
  ['Explore', '/discover'],
];

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe('every button does something', () => {
  it.each(SCREENS)('%s', async (_name, url) => {
    await seed();
    await open(url);
    const all = controls();
    expect(all.length).toBeGreaterThan(0);
    screen.unmount();
    const dead: string[] = [];
    for (const c of all) {
      await seed();
      await open(url);
      const before = JSON.stringify(screen.toJSON());
      const path = pathname();
      const calls = (Linking.openURL as jest.Mock).mock.calls.length;
      const target = screen.queryAllByRole(c.role).filter((n) => !n.props.accessibilityState?.disabled && !n.props['aria-disabled'])[c.i];
      if (!target) {
        screen.unmount(); // the screen changed between renders (e.g. a timed element): skip
        continue;
      }
      if (c.role === 'switch') fireEvent(target, 'valueChange', !target.props.value);
      else fireEvent.press(target);
      await settle();
      const changed = pathname() !== path || JSON.stringify(screen.toJSON()) !== before || (Linking.openURL as jest.Mock).mock.calls.length > calls;
      // The tab for the page you're on (at its start) is meant to do nothing.
      const ownTab = c.role === 'tab' && ((c.label === 'My care' && url === '/saved') || (c.label === 'Profile' && url === '/settings') || (c.label === 'Find' && url === '/'));
      if (!changed && !ownTab) dead.push(`${c.role} "${c.label}"`);
      screen.unmount();
    }
    expect(dead).toEqual([]);
  }, 180_000);
});
