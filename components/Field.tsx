import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Body } from './Text';
import { colors, radius, font } from '../utils/theme';

/** Labelled text input with the wireframe's dashed-border resting state. */
export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const [hidden, setHidden] = useState(secure);

  // Drives the focus transition (0 = resting, 1 = focused). borderColor /
  // backgroundColor can't run on the native driver, so this stays on the JS one.
  const focus = useRef(new Animated.Value(0)).current;
  const animateFocus = (toValue: number) =>
    Animated.timing(focus, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

  const borderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.placeholder, colors.coral],
  });
  const backgroundColor = focus.interpolate({
    inputRange: [0, 1],
    // transparent -> pinkTint (#fbf3f1)
    outputRange: ['rgba(251,243,241,0)', 'rgba(251,243,241,1)'],
  });

  return (
    <View style={styles.wrap}>
      {label != null && (
        <Body color={colors.textMuted} size={13} style={styles.label}>
          {label}
        </Body>
      )}
      <Animated.View style={[styles.inputRow, { borderColor, backgroundColor }]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => animateFocus(1)}
          onBlur={() => animateFocus(0)}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Body size={16}>{hidden ? '👁' : '🙈'}</Body>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {},
  inputRow: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
  },
});
