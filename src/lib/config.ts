import type { Profile } from './profile';

/**
 * Testing phase: sign-in is off, so the app opens straight into Discover with
 * TEST_PROFILE. Set EXPO_PUBLIC_SKIP_SIGN_IN=false (or change the default here)
 * to bring back the welcome screen and sign-up flow.
 */
const SKIP_SIGN_IN = process.env.EXPO_PUBLIC_SKIP_SIGN_IN !== 'false';

export function isSignInSkipped() {
  return SKIP_SIGN_IN;
}

export const TEST_PROFILE: Profile = {
  firstName: 'Tester',
  lastName: 'WATL',
  phoneNumber: '9876543210',
  email: 'tester@example.com',
  age: '25',
  gender: 'Man',
  ethnicity: 'South Asian',
};
