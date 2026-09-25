import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { getClinician } from '@/data/clinicians';
import { demos } from '@/features/match/demos';
import { demoResults } from '@/features/match/sessionCore';

// Every demo patient, through the real screens: funnel → demo → describe → questions → matches.
// The first match shown must be the one the session core predicts.

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

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
  safety: require('@/app/safety').default,
};

beforeEach(() => AsyncStorage.clear());

async function answerUntilDone() {
  for (let i = 0; i < 8; i++) {
    await waitFor(() => undefined);
    if (screen.queryByText('Continue my search')) fireEvent.press(screen.getByText('Continue my search'));
    else if (screen.queryByText('Find my matches')) fireEvent.press(screen.getByText('Find my matches'));
    else if (screen.queryByText('Explain in your own words'))
      fireEvent.press(screen.queryByText('Not sure') ?? screen.getAllByRole('button').filter((b) => b.props.accessibilityLabel === undefined)[0]);
    else break;
  }
}

describe('every demo patient, through the screens', () => {
  it.each(demos.map((d) => [d.title, d]))('%s', async (_title, demo) => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Try a demo patient'));
    fireEvent.press(await screen.findByText(demo.title));
    fireEvent.press(await screen.findByLabelText('Next'));
    if (demo.id === 'either-urgent') expect(await screen.findByText("Let's pause for a moment.")).toBeOnTheScreen();
    await answerUntilDone();

    const expected = demoResults(demo.id).result;
    if (expected?.status === 'matches') {
      const first = getClinician(expected.matches[0].clinicianId)!;
      expect((await screen.findAllByText(first.name)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(expected.matches[0].fit).length).toBeGreaterThan(0);
    } else {
      expect(await screen.findByText(/No one/)).toBeOnTheScreen();
    }
  });
});
