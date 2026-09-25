import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import TabsLayout from '@/app/(tabs)/_layout';
import Discover from '@/app/(tabs)/discover';
import Settings from '@/app/(tabs)/settings';
import Welcome from '@/app/index';
import Dob from '@/app/onboarding/dob';
import Email from '@/app/onboarding/email';
import Ethnicity from '@/app/onboarding/ethnicity';
import Name from '@/app/onboarding/name';
import Otp from '@/app/onboarding/otp';
import Phone from '@/app/onboarding/phone';
import Verified from '@/app/onboarding/verified';
import { ProfileProvider } from '@/lib/profile';

// Lets each test flip the sign-in switch in src/lib/config.ts.
const mockConfig = { skipSignIn: false };
jest.mock('@/lib/config', () => ({
  ...jest.requireActual('@/lib/config'),
  isSignInSkipped: () => mockConfig.skipSignIn,
}));

// Minimal route tree: the real screens, wrapped in the profile provider like the root layout does.
const Root = () => {
  const { Stack } = jest.requireActual('expo-router');
  return (
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  );
};

const routes = {
  _layout: Root,
  index: Welcome,
  'onboarding/phone': Phone,
  'onboarding/otp': Otp,
  'onboarding/verified': Verified,
  'onboarding/name': Name,
  'onboarding/email': Email,
  'onboarding/dob': Dob,
  'onboarding/ethnicity': Ethnicity,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/discover': Discover,
  '(tabs)/settings': Settings,
  '(tabs)/standouts': () => null,
  '(tabs)/likes': () => null,
  '(tabs)/matches': () => null,
};

const saved = async () => JSON.parse((await AsyncStorage.getItem('user_data')) ?? '{}');

beforeEach(async () => {
  mockConfig.skipSignIn = false;
  await AsyncStorage.clear();
});

describe('welcome', () => {
  it('shows the WATL branding and sign-up options', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByLabelText('WATL logo')).toBeOnTheScreen();
    expect(screen.getByText('Designed to be deleted.')).toBeOnTheScreen();
    expect(screen.getByText('Continue with Facebook')).toBeOnTheScreen();
    expect(screen.queryByText(/hinge/i)).toBeNull();
  });

  it('skips to Discover when a profile is already saved', async () => {
    await AsyncStorage.setItem('user_data', JSON.stringify({ firstName: 'Ada' }));
    renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen).toHavePathname('/discover'));
  });
});

describe('sign-up flow', () => {
  it('only accepts a 10-digit phone number', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/phone' });
    const input = await screen.findByLabelText('Phone number');

    fireEvent.changeText(input, '12345');
    fireEvent.press(screen.getByLabelText('Next'));
    expect(await screen.findByText('Enter valid Phone number')).toBeOnTheScreen();
    expect(screen).toHavePathname('/onboarding/phone');

    fireEvent.changeText(input, '98765 43210');
    fireEvent.press(screen.getByLabelText('Next'));
    await waitFor(() => expect(screen).toHavePathname('/onboarding/otp'));
    expect((await saved()).phoneNumber).toBe('9876543210');
  });

  it('moves on once a full verification code is entered', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/otp' });
    fireEvent.changeText(await screen.findByLabelText('Verification code'), '123456');
    await waitFor(() => expect(screen).toHavePathname('/onboarding/verified'));
  });

  it('requires a first name of at least 3 letters', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/name' });
    const first = await screen.findByPlaceholderText('First name');

    fireEvent.changeText(first, 'Al');
    fireEvent.press(screen.getByLabelText('Next'));
    expect(await screen.findByText('Please enter valid name')).toBeOnTheScreen();

    fireEvent.changeText(first, 'Ada');
    fireEvent.changeText(screen.getByPlaceholderText('Last name'), 'Lovelace');
    fireEvent.press(screen.getByLabelText('Next'));
    await waitFor(() => expect(screen).toHavePathname('/onboarding/email'));
    expect(await saved()).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('requires an email with an @', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/email' });
    const input = await screen.findByPlaceholderText('Enter email');

    fireEvent.changeText(input, 'not-an-email');
    fireEvent.press(screen.getByLabelText('Next'));
    expect(await screen.findByText('Enter valid Email address')).toBeOnTheScreen();

    fireEvent.changeText(input, 'ada@example.com');
    fireEvent.press(screen.getByLabelText('Next'));
    await waitFor(() => expect(screen).toHavePathname('/onboarding/dob'));
    expect((await saved()).email).toBe('ada@example.com');
  });

  it('saves the age from the default adult birth date', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/dob' });
    expect(await screen.findByText(/^Age \d+$/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Next'));
    await waitFor(() => expect(screen).toHavePathname('/onboarding/ethnicity'));
    expect(Number((await saved()).age)).toBeGreaterThanOrEqual(18);
  });

  it('finishes sign-up on Discover after picking an ethnicity', async () => {
    renderRouter(routes, { initialUrl: '/onboarding/ethnicity' });
    fireEvent.press(await screen.findByText('White/Caucasian'));
    await waitFor(() => expect(screen).toHavePathname('/discover'));
    expect((await saved()).ethnicity).toBe('Caucasian');
  });
});

describe('discover', () => {
  it('cycles between the seeded profiles on like and pass', async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    expect(await screen.findByText('Lisa')).toBeOnTheScreen();
    expect(screen.getByText('By showing me the code.')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Pass'));
    expect(await screen.findByText('Tzuyu')).toBeOnTheScreen();
    expect(screen.getByText('clean code.')).toBeOnTheScreen();

    fireEvent.press(screen.getAllByLabelText('Like')[0]);
    expect(await screen.findByText('Lisa')).toBeOnTheScreen();
  });

  it('renders all six photos for a profile', async () => {
    renderRouter(routes, { initialUrl: '/discover' });
    await screen.findByText('Lisa');
    for (const caption of ['Looking for an android developer', 'My ex build Brawl Stars.']) {
      expect(screen.getByText(caption)).toBeOnTheScreen();
    }
    expect(screen.getAllByLabelText('Like')).toHaveLength(9); // 6 photos + 3 prompts
  });

  it('switches tabs from the bottom bar', async () => {
    await AsyncStorage.setItem('user_data', JSON.stringify({ firstName: 'Ada' }));
    renderRouter(routes, { initialUrl: '/discover' });
    fireEvent.press(await screen.findByLabelText('Settings'));
    await waitFor(() => expect(screen).toHavePathname('/settings'));
    expect(await screen.findByText('Ada')).toBeOnTheScreen();
    expect(screen.getByText('WATL Member')).toBeOnTheScreen();
  });
});

describe('sign-in skipped (testing phase)', () => {
  beforeEach(() => {
    mockConfig.skipSignIn = true;
  });

  it('opens straight into Discover', async () => {
    renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen).toHavePathname('/discover'));
    expect(await screen.findByText('Lisa')).toBeOnTheScreen();
  });

  it('shows the test profile in Settings', async () => {
    renderRouter(routes, { initialUrl: '/settings' });
    expect(await screen.findByText('Tester')).toBeOnTheScreen();
  });
});
