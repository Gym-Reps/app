import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body } from './Text';
import { colors, radius, spacing, hardShadow } from '../utils/theme';
import { useToast, showToast } from '../lib/toast';
import { setOnServerError } from '../api/client';

const AUTO_DISMISS_MS = 3500;

/**
 * App-wide toast host. Mounted once at the root; slides/fades in on the UI thread
 * (native driver, not a re-render loop) and auto-dismisses. Registers itself as
 * the axios server-error sink so 5xx / network failures surface globally.
 */
export function Toast() {
  const insets = useSafeAreaInsets();
  const current = useToast((s) => s.current);
  const dismiss = useToast((s) => s.dismiss);
  const anim = useRef(new Animated.Value(0)).current;

  // Route axios server/network errors into the toast store for this mount.
  useEffect(() => {
    setOnServerError((message) => showToast(message, 'error'));
    return () => setOnServerError(null);
  }, []);

  // Animate in, then auto-dismiss. Re-runs on each new message (new id).
  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) dismiss();
      });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [current, anim, dismiss]);

  if (!current) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const isError = current.kind === 'error';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + spacing.sm, opacity: anim, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={dismiss}
        style={[styles.toast, isError ? styles.error : styles.info]}
      >
        <Body size={14} color={isError ? colors.bad : colors.ink}>
          {current.text}
        </Body>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
  },
  toast: {
    alignSelf: 'stretch',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...hardShadow,
  },
  error: { backgroundColor: colors.badBg },
  info: { backgroundColor: colors.card },
});
