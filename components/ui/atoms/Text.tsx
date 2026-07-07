import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, font } from '../../../utils/theme';

/**
 * Typed text helpers so the Satoshi weights are applied consistently.
 * `Display` = Satoshi Bold headings & big numbers, `Body` = Satoshi Regular.
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
        { fontSize: size ?? DISPLAY_SIZE },
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
        { fontSize: size ?? DISPLAY_SEMI_SIZE },
        color != null && { color },
        style,
      ]}
    />
  );
}

const DISPLAY_SIZE = 24;
const DISPLAY_SEMI_SIZE = 22;

const styles = StyleSheet.create({
  body: { fontFamily: font.body, fontSize: 15, color: colors.text },
  display: { fontFamily: font.display, color: colors.text },
  displaySemi: { fontFamily: font.displaySemi, color: colors.text },
});
