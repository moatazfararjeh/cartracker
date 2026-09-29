/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#18272A',
    textSecondary: '#698078',
    background: '#F5F7F7',
    /** Cards, inputs, tab bar. */
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EDF6F0',
    border: '#E1E8E5',
    inputBorder: '#D2DFD8',
    tint: '#145B47',
    onTint: '#FFFFFF',
    accent: '#186A53',
    danger: '#C62F35',
    header: '#E3F2E9',
    eyebrow: '#477463',
    headerCard: '#FFFFFF',
    headerCardBorder: '#D7E6DE',
    avatar: '#C9E3D6',
    iconBackground: '#E3EEEB',
    icon: '#28765D',
    warningBackground: '#FFF4DD',
    warningText: '#584016',
    chipSelected: '#DCEFE5',
    chipSelectedText: '#155F47',
    chipSelectedBorder: '#8EC8A8',
    track: '#E0EAE5',
    trackFill: '#218466',
    noteBackground: '#E6F3EB',
    noteText: '#315944',
    tabInactive: '#71877E',
  },
  dark: {
    text: '#EDF4F2',
    textSecondary: '#A4B8B0',
    background: '#141B1D',
    backgroundElement: '#21302F',
    backgroundSelected: '#2A4439',
    border: '#354341',
    inputBorder: '#486054',
    tint: '#92D9B3',
    onTint: '#103D31',
    accent: '#A5E4C5',
    danger: '#FF7B80',
    header: '#1E3935',
    eyebrow: '#99C5B2',
    headerCard: '#243A36',
    headerCardBorder: '#3A5B52',
    avatar: '#34574B',
    iconBackground: '#29453D',
    icon: '#9BD8B7',
    warningBackground: '#3D3424',
    warningText: '#FFE3A5',
    chipSelected: '#345A47',
    chipSelectedText: '#B5EFCC',
    chipSelectedBorder: '#679D7A',
    track: '#35463E',
    trackFill: '#87D2AC',
    noteBackground: '#2B4538',
    noteText: '#C3E8CF',
    tabInactive: '#9DB5AA',
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
/** Column width for tab screens on tablets / web; the design is a phone layout. */
export const ScreenMaxWidth = 560;
