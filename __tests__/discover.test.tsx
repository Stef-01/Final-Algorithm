import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { PROFESSION_INFO } from '@/lib/professions';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/discover': require('@/app/(tabs)/(find)/discover').default,
  '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
};

beforeEach(() => AsyncStorage.clear());

describe('discovery queue', () => {
  it('steps through every kind of professional, then offers to start again', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Explore who does what'));
    for (const p of PROFESSION_INFO) {
      expect(await screen.findByText(p.one === 'GP' ? 'GP' : p.one.charAt(0).toUpperCase() + p.one.slice(1))).toBeOnTheScreen();
      fireEvent.press(screen.getAllByLabelText('Next')[0]);
    }
    expect(await screen.findByText('That’s everyone.')).toBeOnTheScreen();
  });

  it('"Find one" searches that kind of professional', async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    fireEvent.press(screen.getAllByLabelText('Next')[0]); // skip GPs
    fireEvent.press(await screen.findByLabelText('Find psychologists'));
    expect(await screen.findByText('Find a psychologist who fits you.')).toBeOnTheScreen();
  });

  it("dietitians can be read about but not searched yet", async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    for (let i = 0; i < PROFESSION_INFO.findIndex((p) => p.id === 'dietitian'); i++) fireEvent.press(screen.getAllByLabelText('Next')[0]);
    expect(await screen.findByText('Not in the network yet')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Find dietitians and nutritionists')).toBeNull();
  });
});
