import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { TEST_PROFILE } from '@/lib/config';
import { ProfileProvider, useProfile } from '@/lib/profile';

// Lets each test flip the sign-in switch in src/lib/config.ts.
const mockConfig = { skipSignIn: false };
jest.mock('@/lib/config', () => ({
  ...jest.requireActual('@/lib/config'),
  isSignInSkipped: () => mockConfig.skipSignIn,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <ProfileProvider>{children}</ProfileProvider>;

beforeEach(async () => {
  mockConfig.skipSignIn = false;
  await AsyncStorage.clear();
});

describe('profile store', () => {
  it('loads a saved profile', async () => {
    await AsyncStorage.setItem('user_data', JSON.stringify({ firstName: 'Ada' }));
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.profile.firstName).toBe('Ada');
  });

  it('merges updates and persists them', async () => {
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(() => result.current.update({ firstName: 'Ada' }));
    await act(() => result.current.update({ email: 'ada@example.com' }));

    expect(result.current.profile).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
    expect(JSON.parse((await AsyncStorage.getItem('user_data'))!)).toEqual({
      firstName: 'Ada',
      email: 'ada@example.com',
    });
  });

  it('clears everything on log out', async () => {
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.update({ firstName: 'Ada' }));

    await act(() => result.current.clear());

    expect(result.current.profile).toEqual({});
    expect(await AsyncStorage.getItem('user_data')).toBeNull();
  });
});

describe('profile store with sign-in skipped', () => {
  beforeEach(() => {
    mockConfig.skipSignIn = true;
  });

  it('starts as the test profile when nothing is saved', async () => {
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.profile).toEqual(TEST_PROFILE);
  });

  it('prefers a saved profile over the test profile', async () => {
    await AsyncStorage.setItem('user_data', JSON.stringify({ firstName: 'Ada' }));
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.profile.firstName).toBe('Ada'));
  });

  it('goes back to the test profile after log out', async () => {
    const { result } = renderHook(useProfile, { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.update({ firstName: 'Ada' }));
    await act(() => result.current.clear());
    expect(result.current.profile).toEqual(TEST_PROFILE);
  });
});
