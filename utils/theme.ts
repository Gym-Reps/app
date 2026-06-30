/**
 * REPS design tokens — derived from the "Gym Wireframes" board.
 * Friendly & minimal, coral accent, hand-drawn typography, hard offset shadows.
 */

export const colors = {
  // brand
  coral: '#F26B5B',
  ink: '#2b2b2b',

  // surfaces
  screen: '#f4f3ee', // warm paper background behind cards
  card: '#ffffff',
  cardAlt: '#fbfbf9',
  pinkTint: '#fbf3f1',
  pinkStrong: '#ffe1db',

  // semantic
  good: '#4CAF82',
  goodText: '#3c7a5c',
  goodBg: '#e2f3e7',
  goodBorder: '#b6ddc6',
  bad: '#d05a4f',
  badBg: '#fbe9e7',
  badBorder: '#f0c3bd',
  flat: '#c9a23b',

  // text
  text: '#2b2b2b',
  textMuted: '#6b6b6b',
  textFaint: '#8a8a8a',
  textGhost: '#a8a8a8',
  placeholder: '#b6b6b6',

  // lines
  line: '#ededed',
  lineStrong: '#d8d8d8',
  track: '#e3e3e3',
} as const;

export const font = {
  /** Caveat — used for display headings and big numbers. */
  display: 'Caveat_700Bold',
  displaySemi: 'Caveat_600SemiBold',
  /** Patrick Hand — used for body copy and labels. */
  body: 'PatrickHand_400Regular',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** The signature hard, offset drop-shadow used across cards & buttons. */
export const hardShadow = {
  shadowColor: '#2b2b2b',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 0,
  elevation: 3,
} as const;

export const hardShadowStrong = {
  shadowColor: '#2b2b2b',
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 0,
  elevation: 4,
} as const;
