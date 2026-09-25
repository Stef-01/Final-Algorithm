import * as Linking from 'expo-linking';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WatlLogo } from '@/components/WatlLogo';
import { useProfile } from '@/lib/profile';
import { colors, fonts, urls } from '@/lib/theme';

export default function Welcome() {
  const { profile, loaded } = useProfile();
  const player = useVideoPlayer(require('../../assets/video/background.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (!loaded) return <View style={styles.root} />;
  if (profile.firstName) return <Redirect href="/discover" />;

  const startSignUp = () => router.push('/onboarding/phone');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={styles.scrim} />
      <SafeAreaView style={styles.content}>
        <View style={styles.top}>
          <WatlLogo color={colors.white} size={56} />
          <Text style={styles.tagline}>Designed to be deleted.</Text>
        </View>

        <View>
          <Text style={styles.legal}>
            By signing up for WATL, you agree to our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(urls.terms)}>
              Terms of Service
            </Text>
            . Learn how we process your data in our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(urls.privacy)}>
              Privacy Policy
            </Text>
            .
          </Text>
          <Pressable
            onPress={startSignUp}
            accessibilityRole="button"
            style={({ pressed }) => [styles.facebook, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.facebookText}>Continue with Facebook</Text>
          </Pressable>
          <Pressable onPress={startSignUp} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.phone}>Or continue with phone number</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  // Explicit size as well as absolute fill: a web <video> won't stretch from insets alone.
  video: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 42, paddingBottom: 24 },
  top: { alignItems: 'center', marginTop: 55 },
  tagline: { fontFamily: fonts.medium, fontSize: 20, color: colors.white, marginTop: 8 },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 15,
  },
  link: { textDecorationLine: 'underline' },
  facebook: {
    height: 55,
    borderRadius: 100,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 21,
  },
  facebookText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  phone: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 24,
  },
});
