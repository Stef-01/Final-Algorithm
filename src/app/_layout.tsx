import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileProvider } from '@/lib/profile';
import { fontAssets } from '@/lib/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          {['delete-account', 'learn-more', 'roses', 'profile/why-last-name', 'profile/gender-feedback'].map(
            (name) => (
              <Stack.Screen
                key={name}
                name={name}
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            ),
          )}
        </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
