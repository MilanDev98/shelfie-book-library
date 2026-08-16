/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Shelfie's visual language is intentionally warm and restrained: paper,
 * forest green, and a small set of confidence/status colours.
 */
export const ShelfieColors = {
  paper: '#FAF7F1',
  surface: '#FFFFFF',
  surfaceTint: '#F1EFE4',
  ink: '#1C1917',
  body: '#3C3833',
  muted: '#6B6560',
  quiet: '#8C8375',
  subtle: '#9A938B',
  border: '#E4DDD0',
  borderSoft: '#ECE5D9',
  divider: '#EAE3D5',
  primary: '#1F4034',
  primaryPressed: '#2C6B4A',
  onPrimary: '#FBF9F4',
  matched: '#2F7D57',
  matchedTint: '#E7F1EA',
  review: '#8A5A08',
  reviewAccent: '#D79A2B',
  reviewTint: '#FBEEDA',
  noMatch: '#A8442F',
  noMatchTint: '#F7E7E2',
  spine: '#241F1B',
} as const;

export const ShelfieFonts = Platform.select({
  ios: { sans: 'System', serif: 'Georgia' },
  android: { sans: 'sans-serif', serif: 'serif' },
  web: { sans: 'DM Sans, system-ui, sans-serif', serif: 'Newsreader, Georgia, serif' },
  default: { sans: 'System', serif: 'serif' },
})!;

export const ShelfieSpacing = {
  hairline: 1,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const ShelfieRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  full: 999,
} as const;

export const ShelfieTypography = {
  display: {
    color: ShelfieColors.ink,
    fontFamily: ShelfieFonts.serif,
    fontSize: 34,
    fontWeight: '400',
    lineHeight: 36,
  },
  title: {
    color: ShelfieColors.ink,
    fontFamily: ShelfieFonts.sans,
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    color: ShelfieColors.body,
    fontFamily: ShelfieFonts.sans,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyStrong: {
    color: ShelfieColors.body,
    fontFamily: ShelfieFonts.sans,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  emptyTitle: {
    color: ShelfieColors.ink,
    fontFamily: ShelfieFonts.sans,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyDescription: {
    color: ShelfieColors.muted,
    fontFamily: ShelfieFonts.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  label: {
    color: ShelfieColors.body,
    fontFamily: ShelfieFonts.sans,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  button: {
    color: ShelfieColors.onPrimary,
    fontFamily: ShelfieFonts.sans,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    color: ShelfieColors.muted,
    fontFamily: ShelfieFonts.sans,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  badge: {
    color: ShelfieColors.body,
    fontFamily: ShelfieFonts.sans,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  tab: {
    color: ShelfieColors.quiet,
    fontFamily: ShelfieFonts.sans,
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 14,
  },
} as const satisfies Record<string, TextStyle>;

export const ShelfieShadows = {
  card: '0 1px 2px rgba(28, 25, 23, 0.04)',
  raised: '0 8px 20px rgba(31, 64, 52, 0.12)',
} as const;

export const ShelfieMotion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const ShelfieBottomBarHeight = 104;

export type ShelfieBookStatus = 'matched' | 'saved' | 'review' | 'unreadable' | 'no-match';
