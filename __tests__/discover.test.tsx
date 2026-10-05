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
  '(tabs)/(find)/where': require('@/app/(tabs)/(find)/where').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
};

beforeEach(() => AsyncStorage.clear());

describe('who could help grid', () => {
  it('shows a box for every kind of professional', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Explore who does what'));
    expect(await screen.findByText('Who could help?')).toBeOnTheScreen();
    for (const p of PROFESSION_INFO) {
      expect(screen.getByText(p.one === 'GP' ? 'GP' : p.one.charAt(0).toUpperCase() + p.one.slice(1))).toBeOnTheScreen();
    }
  });

  it('tapping a box searches that kind of professional', async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    fireEvent.press(await screen.findByLabelText('Find psychologists'));
    fireEvent.press(await screen.findByLabelText('Anywhere: Telehealth is fine'));
    expect(await screen.findByText('Find a psychologist who fits you.')).toBeOnTheScreen();
  });

  it('dietitians are shown as coming soon, not searchable', async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    expect(await screen.findByLabelText('Dietitian or nutritionist, coming soon')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Find dietitians and nutritionists')).toBeNull();
  });
});
