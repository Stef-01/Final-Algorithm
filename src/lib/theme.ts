export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  purple: '#692F60',
  purpleText: '#763568',
  /** The darker edge a purple button sits on (PressDepth). */
  purpleLip: '#3F1A39',
  boost: '#7eaaa9',
  line: '#a9a9a9',
  // Secondary text. Darker than `line` so it meets WCAG AA (4.5:1) on white and the grey background.
  muted: '#6B6B6B',
  chip: '#D0D0D0',
  tabBar: '#1A1A1A',
  tabInactive: '#7A7A7A', // ≥3:1 on the tab bar (WCAG non-text contrast)
  rose: '#C6B5C7',
  background: '#F1F1F1',
  /** The darker edge a black button sits on (PressDepth). */
  blackLip: '#3A3A3A',
  /** Behind sheets and pop-ups. */
  scrim: 'rgba(0,0,0,0.45)',
  /** The underline of a text box. */
  inputLine: '#B0B0B0',
  /** A soft purple wash (the assistant's memory in the example chat). */
  purpleTint: '#F6F0F5',
  error: '#C62828',
  /** The Claude card on Connect your AI. */
  claude: '#C96442',
};

export const fonts = {
  regular: 'ModernEra-Regular',
  medium: 'ModernEra-Medium',
  bold: 'ModernEra-Bold',
  serif: 'TiemposHeadline-Regular',
  serifSemiBold: 'TiemposHeadline-SemiBold',
};

export const fontAssets = {
  [fonts.regular]: require('../../assets/fonts/modern_era_regular.otf'),
  [fonts.medium]: require('../../assets/fonts/modern_era_medium.otf'),
  [fonts.bold]: require('../../assets/fonts/modern_era_bold.otf'),
  [fonts.serif]: require('../../assets/fonts/tiempos_headline_regular.otf'),
  [fonts.serifSemiBold]: require('../../assets/fonts/tiempos_headline_semi_bold.otf'),
};
