import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { restoreConnection } from '@/features/connect/connection';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/saved': () => null,
  '(tabs)/settings': require('@/app/(tabs)/settings').default,
  connect: require('@/app/connect').default,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  // Reduced motion: every step shows at once, so the test needn't wait on animations.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe('connect your AI (MCP)', () => {
  it('walks through connecting Claude, then shows the real tool results in an example chat', async () => {
    renderRouter(routes, { initialUrl: '/settings' });
    fireEvent.press(await screen.findByText('Connect Claude or ChatGPT'));
    fireEvent.press(await screen.findByLabelText('Connect Claude'));
    expect(await screen.findByText('Add WATL to Claude')).toBeOnTheScreen();
    expect(screen.getAllByText('https://final-algorithm.vercel.app/api/mcp')[0]).toBeOnTheScreen();
    fireEvent(screen.getByLabelText('What you’ve told your AI'), 'valueChange', false);
    fireEvent.press(screen.getByText('Connect Claude'));
    // Four messages back and forth, each with its own call to WATL.
    expect(await screen.findAllByText('WATL · find_professionals', {}, { timeout: 6000 })).toHaveLength(4);
    expect(screen.getByText(/executives like me/)).toBeOnTheScreen();
    expect(screen.getByText(/None of them mention executives/)).toBeOnTheScreen();
    // Without chat history, only what was said goes to WATL.
    expect(screen.getAllByText('You said')).toHaveLength(4);
    expect(screen.queryByText('Your chats')).toBeNull();
    expect(screen.getAllByLabelText(/, (Strong fit|Good fit|Worth considering|Possible fit)$/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText('Done'));
    expect(await screen.findByText('Connected to Claude')).toBeOnTheScreen();
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('watl_ai'))!)).toMatchObject({ client: 'claude', shares: ['goals', 'practical'] }));
  });

  it('keeps only valid saved connections', () => {
    expect(restoreConnection({ client: 'claude', since: '2026-09-26', shares: ['goals', 'bank'] })).toEqual({ client: 'claude', since: '2026-09-26', shares: ['goals'] });
    expect(restoreConnection({ client: 'bard', since: 'x' })).toBeNull();
    expect(restoreConnection(null)).toBeNull();
  });
});
