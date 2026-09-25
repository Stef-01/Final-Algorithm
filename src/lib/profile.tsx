import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Same keys the Android app kept in SharedPreferences ("user_data").
export type Profile = Partial<{
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  gender: string;
  ethnicity: string;
  location: string;
  height: string;
  education: string;
  religion: string;
  country: string;
}>;

const STORAGE_KEY = 'user_data';

type ProfileContextValue = {
  profile: Profile;
  loaded: boolean;
  update: (patch: Profile) => Promise<void>;
  clear: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({});
  const [loaded, setLoaded] = useState(false);
  const current = useRef<Profile>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        current.current = JSON.parse(raw);
        setProfile(current.current);
      })
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (patch: Profile) => {
    current.current = { ...current.current, ...patch };
    setProfile(current.current);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.current));
  }, []);

  const clear = useCallback(async () => {
    current.current = {};
    setProfile({});
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loaded, update, clear }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
