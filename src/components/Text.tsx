import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

/**
 * Typed text helpers so the two brand fonts (Caveat / Patrick Hand) are applied
 * consistently. `Display` = Caveat headings & big numbers, `Body` = Patrick Hand.
 */

type Props = TextProps & { color?: string; size?: number };

export function Body({ style, color, size, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        styles.body,
        size != null && { fontSize: size },
        color != null && { color },
        style,
      ]}
    />
  );
}

export function Display({ style, color, size, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        styles.display,
        size != null && { fontSize: size },
        color != null && { color },
        style,
      ]}
    />
  );
}

export function DisplaySemi({ style, color, size, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        styles.displaySemi,
        size != null && { fontSize: size },
        color != null && { color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.body, fontSize: 15, color: colors.text },
  display: { fontFamily: font.display, fontSize: 24, color: colors.text },
  displaySemi: { fontFamily: font.displaySemi, fontSize: 22, color: colors.text },
});
