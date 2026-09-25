import AsyncStorage from '@react-native-async-storage/async-storage';
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
import BookingHandoff from '@/app/book/[id]';
import ClinicianDetail from '@/app/clinician/[id]';
import DevStates from '@/app/dev/states';
import Safety from '@/app/safety';
import { DEMO_TEXT } from '@/features/match/fixtureAgent';

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
  'book/[id]': BookingHandoff,
  'dev/states': DevStates,
  safety: Safety,
};

beforeEach(() => AsyncStorage.clear());

async function describeNeeds(text: string) {
  renderRouter(routes, { initialUrl: '/' });
  fireEvent.changeText(await screen.findByLabelText("What you're looking for"), text);
  fireEvent.press(screen.getByLabelText('Next'));
}

async function runDemo() {
  await describeNeeds(DEMO_TEXT);
  fireEvent.press(await screen.findByText('Explain them and decide together'));
  await screen.findByText('Dr Amy Chen');
}

describe('app shell', () => {
  it('opens straight into Find with no sign-in', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Find a GP who fits you.')).toBeOnTheScreen();
    expect(screen.queryByText(/sign in|sign up/i)).toBeNull();
    expect(screen.queryByText(/hinge|adhdme/i)).toBeNull();
  });

  it('has exactly three tabs: Find, Saved, Settings', async () => {
    renderRouter(routes, { initialUrl: '/' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Find', 'Saved', 'Settings']);
  });

  it("doesn't move on until something has been typed", async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Next'));
    expect(screen).toHavePathname('/');
  });
});

describe('PRD demo script (§52)', () => {
  it('asks one follow-up, then shows Amy as a strong fit with the three demo reasons', async () => {
    await describeNeeds(DEMO_TEXT);
    expect(await screen.findByText('When there are several reasonable options, what do you prefer?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Explain them and decide together'));

    expect(await screen.findByText('Dr Amy Chen')).toBeOnTheScreen();
    expect(screen).toHavePathname('/matches');
    expect(screen.getByText("I found 3 clinicians I'd start with.")).toBeOnTheScreen();
    expect(screen.getByLabelText('Strong fit')).toBeOnTheScreen();
    expect(screen.getByText("You said rushed appointments haven't worked for you.")).toBeOnTheScreen();
    expect(screen.getByText(/ADHD, sleep and mental health in one plan/)).toBeOnTheScreen();
    expect(screen.getByText(/explains the trade-offs/)).toBeOnTheScreen();
    for (const chip of ['Tomorrow', '$42 gap', 'Telehealth']) expect(screen.getByText(chip)).toBeOnTheScreen();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('steps through the three matches, then offers more options only on request', async () => {
    await runDemo();
    fireEvent.press(screen.getByLabelText('Next match'));
    expect(await screen.findByText('Dr Priya Nair')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Next match'));
    expect(await screen.findByText('Dr Tom Walsh')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Next match'));

    expect(await screen.findByText("That's everyone I'd start with.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText('See more options'));
    expect(await screen.findByText('Dr Grace Okafor')).toBeOnTheScreen();
    expect(screen.getByLabelText('Worth considering')).toBeOnTheScreen();
  });

  it('opens the clinician detail and hands off to booking', async () => {
    await runDemo();
    fireEvent.press(screen.getByText('View Amy'));
    await waitFor(() => expect(screen).toHavePathname('/clinician/amy-chen'));
    expect(screen.getByText('Why I matched you')).toBeOnTheScreen();
    expect(screen.getByText('Next available: Tomorrow, 3:30 pm')).toBeOnTheScreen();
    expect(screen.getByText('$120 · approx. $42 after Medicare')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Book with Amy'));
    expect(await screen.findByText('Booking with Amy')).toBeOnTheScreen();
  });

  it('goes to the next match from the detail page', async () => {
    await runDemo();
    fireEvent.press(screen.getByText('View Amy'));
    fireEvent.press(await screen.findByText('See next match'));
    expect(await screen.findByText('Dr Priya Nair')).toBeOnTheScreen();
  });

  it('saves a clinician to the Saved tab', async () => {
    await runDemo();
    fireEvent.press(screen.getAllByLabelText('Save Amy')[0]);
    expect(screen.getAllByLabelText('Saved Amy').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByLabelText('Saved'));
    expect(await screen.findByText('Strong fit · GP · New Farm, Brisbane')).toBeOnTheScreen();
  });
});

describe('other paths', () => {
  it('confirms priorities when the answer is "Not sure"', async () => {
    await describeNeeds(DEMO_TEXT);
    fireEvent.press(await screen.findByText('Not sure'));
    expect(await screen.findByText("Here's what seems to matter most.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Longer appointments'));
    fireEvent.press(screen.getByText('Find my matches'));
    expect(await screen.findByText('Dr Amy Chen')).toBeOnTheScreen();
    expect(screen.queryByText("You said rushed appointments haven't worked for you.")).toBeNull();
  });

  it('accepts an answer in the patient’s own words', async () => {
    await describeNeeds(DEMO_TEXT);
    fireEvent.press(await screen.findByText('Explain in your own words'));
    fireEvent.changeText(screen.getByLabelText('Your answer'), "I'd like to talk it through together.");
    fireEvent.press(screen.getByLabelText('Next'));
    expect(await screen.findByText('Dr Amy Chen')).toBeOnTheScreen();
  });

  it('shows only the 2 clinicians who fit, without padding', async () => {
    await describeNeeds(`${DEMO_TEXT} I need a GP who bulk bills.`);
    fireEvent.press(await screen.findByText('Explain them and decide together'));
    expect(await screen.findByText("I found 2 clinicians I'd recommend.")).toBeOnTheScreen();
    expect(screen.getByText('Dr Priya Nair')).toBeOnTheScreen();
  });

  it("says when there's no strong match and offers one next action", async () => {
    await describeNeeds('I need longer appointments on the weekend, in person.');
    fireEvent.press(await screen.findByText('Explain them and decide together'));
    expect(await screen.findByText("I don't have a strong enough match yet.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Include telehealth'));
    expect(await screen.findByText("I found 1 clinician I'd recommend.")).toBeOnTheScreen();
    expect(screen.getByText('Dr Grace Okafor')).toBeOnTheScreen();
  });

  it('pauses for safety on urgent wording, then carries on', async () => {
    await describeNeeds('I have chest pain and want a GP who explains things.');
    expect(await screen.findByText(/call 000/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Continue finding a GP'));
    expect(await screen.findByText('When there are several reasonable options, what do you prefer?')).toBeOnTheScreen();
  });

  it('start over clears the search', async () => {
    await runDemo();
    fireEvent.press(screen.getByLabelText('Settings'));
    fireEvent.press(await screen.findByText('Start over'));
    expect(await screen.findByText('Find a GP who fits you.')).toBeOnTheScreen();
    expect(screen.getByLabelText("What you're looking for").props.value).toBe('');
  });
});

describe('review page', () => {
  it('lists every state and opens one', async () => {
    renderRouter(routes, { initialUrl: '/dev/states' });
    for (const frame of ['01_Open', '03_Followup_Choice', '05_Preference_Confirm', '07_Match_1', '10_Clinician_Detail', '11_No_Strong_Match']) {
      expect(await screen.findByText(frame)).toBeOnTheScreen();
    }
    fireEvent.press(screen.getByText('Match 2'));
    expect(await screen.findByText('Dr Priya Nair')).toBeOnTheScreen();
  });
});
