import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('@/features/match/remoteExtract', () => ({ ...jest.requireActual('@/features/match/remoteExtract'), API_BASE: 'https://watl.test' }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/saved': () => null,
  '(tabs)/settings': require('@/app/(tabs)/settings').default,
  join: require('@/app/join').default,
};

beforeEach(() => AsyncStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('Join WATL', () => {
  it('shows what to fix, then thanks you once it goes through', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ problems: ['fee-words', 'consent'] }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ queued: false }), { status: 202 }));
    renderRouter(routes, { initialUrl: '/settings' });
    fireEvent.press(await screen.findByText('Join WATL'));
    fireEvent.changeText(await screen.findByLabelText('Name'), 'Sam Lee');
    fireEvent.changeText(screen.getByLabelText('Fee ($)'), '220');
    fireEvent.press(screen.getByText('Send for review'));
    expect(await screen.findByText('Put your fee in your words too')).toBeOnTheScreen();
    expect(screen.getByText('Tick the agreement')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText('In your words'), 'Sessions are $220.');
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByText('Send for review'));
    expect(await screen.findByText('Thanks. We’ll review it and be in touch.')).toBeOnTheScreen();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const sent = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(sent).toMatchObject({ name: 'Sam Lee', consent: true, inTheirWords: 'Sessions are $220.', facts: { fee: '220' } });
  });
});
