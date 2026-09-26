import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout').default,
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
  '(tabs)/(find)/clarify': require('@/app/(tabs)/(find)/clarify').default,
  '(tabs)/(find)/confirm': require('@/app/(tabs)/(find)/confirm').default,
  '(tabs)/(find)/matching': require('@/app/(tabs)/(find)/matching').default,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  refine: require('@/app/refine').default,
};

beforeEach(() => AsyncStorage.clear());

describe('floating assistant', () => {
  it('is always there, and refines the matches in conversation', async () => {
    await AsyncStorage.setItem('watl_session', JSON.stringify(demoResults('psych-masking')));
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('Refine your matches with the assistant'));
    expect((await screen.findAllByText(/who fit\. Tell me what to change/))[0]).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Online only'));
    expect((await screen.findAllByText(/^Done: now online sessions only\./, {}, { timeout: 3000 }))[0]).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText('Message the assistant'), 'hmm not sure');
    fireEvent.press(screen.getByLabelText('Send'));
    expect((await screen.findAllByText(/couldn't pick out a change/, {}, { timeout: 3000 }))[0]).toBeOnTheScreen();

    fireEvent.press(screen.getByText('See matches'));
    await waitFor(() => expect(screen.queryByLabelText('Message the assistant')).toBeNull());
  });

  it('starts a search from the first screen too', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ask the assistant'));
    expect((await screen.findAllByText(/Tell me what you're looking for/))[0]).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Message the assistant'), 'I have ADHD and I want a psychologist with practical strategies');
    fireEvent.press(screen.getByLabelText('Send'));
    await waitFor(() => expect(screen.queryByLabelText('Message the assistant')).toBeNull(), { timeout: 3000 });
  });
});

describe('assistant accessibility', () => {
  it('announces the newest reply to screen readers', async () => {
    await AsyncStorage.setItem('watl_session', JSON.stringify(demoResults('psych-masking')));
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('Refine your matches with the assistant'));
    fireEvent.press(await screen.findByText('Online only'));
    await waitFor(() => {
      const live = screen.UNSAFE_root.findAll((n) => n.props.accessibilityLiveRegion === 'polite' && typeof n.props.children === 'string');
      expect(live.some((n) => /^Done: now online sessions only/.test(n.props.children))).toBe(true);
    }, { timeout: 3000 });
  });
});
