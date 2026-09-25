import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import FindLayout from '@/app/(tabs)/(find)/_layout';
import OpenConversation from '@/app/(tabs)/(find)/index';
import Clarify from '@/app/(tabs)/(find)/clarify';
import Confirm from '@/app/(tabs)/(find)/confirm';
import Matching from '@/app/(tabs)/(find)/matching';
import Matches from '@/app/(tabs)/(find)/matches';
import Saved from '@/app/(tabs)/saved';
import Settings from '@/app/(tabs)/settings';
import ClinicianDetail from '@/app/clinician/[id]';
import Safety from '@/app/safety';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(find)/_layout': FindLayout,
  '(tabs)/(find)/index': OpenConversation,
  '(tabs)/(find)/clarify': Clarify,
  '(tabs)/(find)/confirm': Confirm,
  '(tabs)/(find)/matching': Matching,
  '(tabs)/(find)/matches': Matches,
  '(tabs)/saved': Saved,
  '(tabs)/settings': Settings,
  'clinician/[id]': ClinicianDetail,
  safety: Safety,
};

describe('app shell', () => {
  it('opens straight into Find with no sign-in', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Find a GP who fits you.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(screen.queryByText(/sign in|sign up|phone number/i)).toBeNull();
    expect(screen.queryByText(/hinge|adhdme/i)).toBeNull();
  });

  it('has exactly three tabs: Find, Saved, Settings', async () => {
    renderRouter(routes, { initialUrl: '/' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Find', 'Saved', 'Settings']);
  });

  it('switches between tabs', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Saved'));
    expect(await screen.findByText('Nothing saved yet.')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Settings'));
    expect(await screen.findByText('Start over')).toBeOnTheScreen();
  });
});

describe('find flow skeleton', () => {
  it('only moves on once something has been typed', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Next'));
    expect(screen).toHavePathname('/');

    fireEvent.changeText(screen.getByLabelText("What you're looking for"), 'Appointments always feel rushed.');
    fireEvent.press(screen.getByLabelText('Next'));
    await waitFor(() => expect(screen).toHavePathname('/clarify'));
  });

  it('advances as soon as a follow-up answer is tapped', async () => {
    renderRouter(routes, { initialUrl: '/clarify' });
    fireEvent.press(await screen.findByText('Explain them and decide together'));
    await waitFor(() => expect(screen).toHavePathname('/matches'));
  });

  it('opens a clinician above the tabs and comes back', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByText('View a clinician'));
    await waitFor(() => expect(screen).toHavePathname('/clinician/demo'));
    fireEvent.press(screen.getByLabelText('Back'));
    await waitFor(() => expect(screen).toHavePathname('/matches'));
  });

  it('opens the safety sheet from Settings', async () => {
    renderRouter(routes, { initialUrl: '/settings' });
    fireEvent.press(await screen.findByText('Help and safety'));
    expect(await screen.findByText(/call 000/)).toBeOnTheScreen();
  });
});
