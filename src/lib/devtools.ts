/**
 * Testing phase: review tools (the /dev/states page and the demo-text shortcut)
 * are on in every build, including Vercel. Set EXPO_PUBLIC_DEV_TOOLS=false to
 * hide them for real users.
 */
export const devToolsEnabled = process.env.EXPO_PUBLIC_DEV_TOOLS !== 'false';
