import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import FindLayout from '@/app/(tabs)/(find)/_layout';
import Funnel from '@/app/(tabs)/(find)/index';
import Describe from '@/app/(tabs)/(find)/describe';
import Demos from '@/app/(tabs)/(find)/demos';
import AllMatches from '@/app/(tabs)/(find)/all';
import Clarify from '@/app/(tabs)/(find)/clarify';
import Confirm from '@/app/(tabs)/(find)/confirm';
import Matching from '@/app/(tabs)/(find)/matching';
import Matches from '@/app/(tabs)/(find)/matches';
import Saved from '@/app/(tabs)/saved';
import Settings from '@/app/(tabs)/settings';
import BookingHandoff from '@/app/book/[id]';
import ClinicianDetail from '@/app/clinician/[id]';
import DevStates from '@/app/dev/states';
import Safety from '@/app/safety';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(find)/_layout': FindLayout,
  '(tabs)/(find)/index': Funnel,
  '(tabs)/(find)/describe': Describe,
  '(tabs)/(find)/demos': Demos,
  '(tabs)/(find)/all': AllMatches,
  '(tabs)/(find)/clarify': Clarify,
  '(tabs)/(find)/confirm': Confirm,
  '(tabs)/(find)/matching': Matching,
  '(tabs)/(find)/matches': Matches,
  '(tabs)/saved': Saved,
  '(tabs)/settings': Settings,
  'clinician/[id]': ClinicianDetail,
  'book/[id]': BookingHandoff,
  'dev/states': DevStates,
  safety: Safety,
};

beforeEach(() => AsyncStorage.clear());

/** Answer follow-ups ("Not sure" where offered) and confirm priorities until the matches appear. */
async function answerUntilMatches() {
  for (let i = 0; i < 6; i++) {
    await waitFor(() => undefined);
    if (screen.queryByText('Find my matches')) fireEvent.press(screen.getByText('Find my matches'));
    else if (screen.queryByText('Explain in your own words'))
      fireEvent.press(screen.queryByText('Not sure') ?? screen.getAllByRole('button').filter((b) => b.props.accessibilityLabel === undefined)[0]);
    else break;
  }
}

async function startDemo(title: string) {
  renderRouter(routes, { initialUrl: '/' });
  fireEvent.press(await screen.findByText('Try a demo patient'));
  fireEvent.press(await screen.findByText(title));
  expect(await screen.findByText(`Demo patient: ${title}`)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Next'));
}

describe('app shell', () => {
  it('opens on the funnel: who are you looking for?', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Who could help?')).toBeOnTheScreen();
    for (const o of ['GP', 'Psychologist', 'ADHD coach', 'Physiotherapist', 'Not sure yet']) expect(screen.getByText(o)).toBeOnTheScreen();
    // Kinds with nobody in the network yet are shown but can't be searched.
    expect(screen.getByLabelText('Dietitian. Food, nutrition. Not in the network yet').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByText(/sign in|sign up|hinge|adhdme/i)).toBeNull();
  });

  it('has exactly three tabs: Find, Saved, Settings', async () => {
    renderRouter(routes, { initialUrl: '/' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Find', 'Saved', 'Settings']);
  });

  it('words the next screen for the chosen profession', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Psychologist'));
    expect(await screen.findByText('Find a psychologist who fits you.')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('What are you hoping a psychologist can help with?')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen).toHavePathname('/describe'); // nothing typed yet
  });
});

describe('demo run-throughs', () => {
  it('trauma, online only: explained matches, with everyone else ranked behind', async () => {
    await startDemo('Trauma, online sessions only');
    await answerUntilMatches();
    expect(await screen.findByText('Alice Bui')).toBeOnTheScreen();
    expect(screen.getByText(/^See all \d+ who fit$/)).toBeOnTheScreen();
    expect(screen.getByText("I found 3 psychologists I'd start with.")).toBeOnTheScreen();
    expect(screen.getByLabelText('Strong fit')).toBeOnTheScreen();
    expect(screen.getByText("You're looking for help with trauma.")).toBeOnTheScreen();
    expect(screen.getByText('Alice describes her therapy style as trauma-informed and collaborative.')).toBeOnTheScreen();
    expect(screen.getByText('Fee on request')).toBeOnTheScreen();
    expect(screen.getByText('Telehealth')).toBeOnTheScreen();
    expect(screen.queryByText(/%/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Next match'));
    expect(await screen.findByText('Paula Garrido')).toBeOnTheScreen();
    expect(screen.getByText('$104 after rebate')).toBeOnTheScreen();
  });

  it('opens a real profile and hands off to the practice’s booking page', async () => {
    await startDemo('Trauma, online sessions only');
    await answerUntilMatches();
    await screen.findByText('Alice Bui');
    fireEvent.press(screen.getByLabelText('Next match'));
    fireEvent.press(await screen.findByText('View Paula'));
    await waitFor(() => expect(screen).toHavePathname('/clinician/paula-garrido'));
    expect(screen.getAllByText(/^Why they fit/)[0]).toBeOnTheScreen();
    expect(screen.getByText(/\$253 per session, \$149 Medicare rebate/)).toBeOnTheScreen();
    expect(screen.getByText('Wellness Psychology Clinic')).toBeOnTheScreen();

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByText('Book with Paula'));
    fireEvent.press(await screen.findByText('Open booking page'));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://wellnesspsychologyclinic.com.au/appointment-page/'));
  });

  it('female GP: one match, without padding', async () => {
    await startDemo('A female GP for ADHD and women’s health');
    expect(await screen.findByText('Dr Anu Saxena')).toBeOnTheScreen();
    expect(screen.getByText("I found 1 GP I'd recommend.")).toBeOnTheScreen();
    expect(screen.getByText('$299, no rebate')).toBeOnTheScreen();
  });

  it('asks a follow-up when it would change the list, then shows results', async () => {
    await startDemo('Burnt out from masking');
    expect(await screen.findByText('Explain in your own words')).toBeOnTheScreen();
    await answerUntilMatches();
    expect(await screen.findByText('Jessica Katsamatsas')).toBeOnTheScreen();
    expect(screen.getByText(/hand you a list of strategies/)).toBeOnTheScreen();
  });

  it('bulk-billed psychologist: lists psychologists and flags the unconfirmed cost', async () => {
    await startDemo('A bulk-billed psychologist');
    await answerUntilMatches();
    await waitFor(() => expect(screen).toHavePathname('/matches'));
    expect(screen.getAllByText(/out-of-pocket cost isn't published/).length).toBeGreaterThan(0);
  });

  it('shows everyone who fits, ranked, on the "See all" list', async () => {
    await startDemo('Trauma, online sessions only');
    await answerUntilMatches();
    fireEvent.press(await screen.findByText(/^See all \d+ who fit$/));
    expect(await screen.findByText("I'd start with")).toBeOnTheScreen();
    expect(screen.getByText('Also a fit')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText(/^1\. Alice Bui/));
    await waitFor(() => expect(screen).toHavePathname('/clinician/alice-bui'));
  });

  it('urgent symptom: pauses for safety, then carries on', async () => {
    await startDemo('An urgent symptom');
    expect(await screen.findByText(/call 000/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Continue my search'));
    await waitFor(() => expect(screen.getByText(/\?$/)).toBeOnTheScreen());
  });

  it('saves a clinician to the Saved tab', async () => {
    await startDemo('Straight talk about work pressure, Gold Coast');
    expect(await screen.findByText('Bart Traynor')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByLabelText('Save Bart')[0]);
    fireEvent.press(screen.getByLabelText('Saved'));
    expect(await screen.findByText('Strong fit · Clinical Psychologist and Director · Bundall, Gold Coast')).toBeOnTheScreen();
  });
});

describe('typed searches', () => {
  it('runs the real engine on what the patient types', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('Psychologist'));
    fireEvent.changeText(await screen.findByLabelText("What you're looking for"), "I've been through trauma and want online sessions only.");
    fireEvent.press(screen.getByLabelText('Next'));
    await screen.findAllByText(/\?$|I found|strong enough/);
    await answerUntilMatches();
    await waitFor(() => expect(screen).toHavePathname('/matches'));
  });

  it('start over clears the search and returns to the funnel', async () => {
    await startDemo('Straight talk about work pressure, Gold Coast');
    await screen.findByText('Bart Traynor');
    fireEvent.press(screen.getByLabelText('Settings'));
    fireEvent.press(await screen.findByText('Start over'));
    expect(await screen.findByText('Who could help?')).toBeOnTheScreen();
  });
});

describe('review page', () => {
  it('lists every state and opens one', async () => {
    renderRouter(routes, { initialUrl: '/dev/states' });
    for (const frame of ['00_Funnel', '01_Open', '03_Followup_Choice', '07_Match_1', '10_Clinician_Detail', '11_No_Strong_Match']) {
      expect(await screen.findByText(frame)).toBeOnTheScreen();
    }
    fireEvent.press(screen.getByText('Match 2'));
    await waitFor(() => expect(screen).toHavePathname('/matches'));
    expect(screen.getByText('2 of 3')).toBeOnTheScreen();
  });
});
