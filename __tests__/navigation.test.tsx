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

/** Answer any follow-up questions with their first option until the matches appear. */
async function answerUntilMatches() {
  for (let i = 0; i < 4; i++) {
    if (screen.queryByText('Explain in your own words') === null) break;
    const options = screen.getAllByRole('button').filter((b) => b.props.accessibilityLabel === undefined);
    fireEvent.press(options[0]);
    await waitFor(() => undefined);
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
    expect(await screen.findByText('Who are you looking for?')).toBeOnTheScreen();
    for (const o of ['A GP', 'A psychologist', 'Not sure yet']) expect(screen.getByText(o)).toBeOnTheScreen();
    expect(screen.queryByText(/sign in|sign up|hinge|adhdme/i)).toBeNull();
  });

  it('has exactly three tabs: Find, Saved, Settings', async () => {
    renderRouter(routes, { initialUrl: '/' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Find', 'Saved', 'Settings']);
  });

  it('words the next screen for the chosen profession', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByText('A psychologist'));
    expect(await screen.findByText('Find a psychologist who fits you.')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('What are you hoping a psychologist can help with?')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen).toHavePathname('/describe'); // nothing typed yet
  });
});

describe('demo run-throughs', () => {
  it('trauma, online only: goes straight to explained matches', async () => {
    await startDemo('Trauma, online sessions only');
    expect(await screen.findByText('Alice Bui')).toBeOnTheScreen();
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
    fireEvent.press(screen.getByLabelText('Next match'));
    fireEvent.press(await screen.findByText('View Paula'));
    await waitFor(() => expect(screen).toHavePathname('/clinician/paula-garrido'));
    expect(screen.getByText('Why I matched you')).toBeOnTheScreen();
    expect(screen.getByText(/\$253 a session, \$149 Medicare rebate/)).toBeOnTheScreen();
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

  it('asks a follow-up, confirms an uncertain priority, then shows results', async () => {
    await startDemo('Burnt out from masking');
    expect(await screen.findByText('When there are several reasonable options, what do you prefer?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Explain them and decide together'));
    expect(await screen.findByText("Here's what seems to matter most.")).toBeOnTheScreen();
    expect(screen.getByText('Neurodiversity-affirming')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Find my matches'));
    expect(await screen.findByText('Jessica Katsamatsas')).toBeOnTheScreen();
    expect(screen.getByText(/hand you a list of strategies/)).toBeOnTheScreen();
  });

  it('bulk-billed psychologist: says honestly there is no strong match', async () => {
    await startDemo('A bulk-billed psychologist');
    expect(await screen.findByText("I don't have a strong enough match yet.")).toBeOnTheScreen();
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
    fireEvent.press(await screen.findByText('A psychologist'));
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
    expect(await screen.findByText('Who are you looking for?')).toBeOnTheScreen();
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
