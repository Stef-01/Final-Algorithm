import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { demoById } from '@/features/match/demos';
import { demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('watl_session', JSON.stringify({ ...demoResults('psych-trauma-online'), updatedAt: Date.now() }));
});

describe('always a way back', () => {
  it('steps back through matches, then back to the search with your words ready to edit', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    expect((await screen.findAllByText('Alice Bui')).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByLabelText('Next match'));
    expect(await screen.findByLabelText('Previous match')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Previous match'));
    fireEvent.press(await screen.findByLabelText('Back to your search'));
    const box = await screen.findByLabelText("What you're looking for");
    expect(box.props.value).toBe(demoById('psych-trauma-online')!.text);
  });

  it('shows saved as a filled heart', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    const save = (await screen.findAllByLabelText('Save Alice'))[0];
    fireEvent.press(save);
    expect((await screen.findAllByLabelText('Saved Alice'))[0].props.accessibilityState).toMatchObject({ selected: true });
  });
});
