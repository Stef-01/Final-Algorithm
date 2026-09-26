import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Text } from 'react-native';

import { track } from '@/lib/analytics';
import { tap } from '@/lib/haptics';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { PressScale } from './motion';

const SITE = 'https://final-algorithm.vercel.app';

/** Share a profile (to a GP, a partner, yourself): the share sheet, or copy the link where there isn't one. */
export function ShareButton({ id, name }: { id: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/clinician/${id}`;
  const share = async () => {
    tap();
    track('profile_shared', { clinician: id });
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    try {
      if (Platform.OS !== 'web') return void (await Share.share({ message: `${name} on WATL: ${url}`, url }));
      if (nav?.share) return void (await nav.share({ title: name, url }));
    } catch {
      return; // closed the share sheet
    }
    await Clipboard.setStringAsync(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <PressScale onPress={share} accessibilityRole="button" accessibilityLabel={copied ? 'Link copied' : `Share ${name}'s profile`} style={styles.button} scaleTo={0.88}>
      {copied ? <Text style={styles.copied}>Copied</Text> : <Icon name="icSend" size={18} color={colors.black} />}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  copied: { fontFamily: fonts.bold, fontSize: 12, color: colors.purpleText },
});
