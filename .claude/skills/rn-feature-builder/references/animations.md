# Animations & gestures — Reanimated 4

Installed: `react-native-reanimated@4`. **v4 is a major break from v3** — it
requires the New Architecture (Fabric), and worklets now live in the separate
`react-native-worklets` package (installed as its peer; the Babel plugin is
`react-native-worklets/plugin`). Confirm the plugin is in `babel.config.js` and
the New Arch is on before debugging "worklet is not a function" errors.

## Two animation systems exist in this repo — don't mix them on one node

`Field.tsx` and `Root.tsx` use React Native's **legacy `Animated`** API
(`Animated.Value`, `interpolate`, `useNativeDriver`). Reanimated's `Animated` is
a **different import**. For **new** interactions, prefer Reanimated (runs on the
UI thread, no native-driver caveats for color/layout). Leave working legacy code
alone unless asked to migrate; never apply both to the same component.

## Core model

Animate **shared values** read inside `useAnimatedStyle` — this runs on the UI
thread, so it doesn't re-render React. Never animate by setting React state in a
loop.

```tsx
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence,
  withRepeat, withDelay, interpolate, Extrapolation, Easing, runOnJS,
} from 'react-native-reanimated';

function PressScale({ onPress, children }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 14 }); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
```

This matches the app's existing press feel (the `Button` "hard shadow" press
offset) but on the UI thread.

## Builders

- `withTiming(to, { duration, easing: Easing.out(Easing.cubic) })`
- `withSpring(to, { damping, stiffness, mass })` — for tactile, interruptible motion.
- `withSequence(a, b, …)`, `withDelay(ms, anim)`, `withRepeat(anim, n, reverse)`.
- `cancelAnimation(sharedValue)` to stop.
- `interpolate(x, [0,1], [0,100], Extrapolation.CLAMP)` for mapping ranges.
- `runOnJS(fn)(args)` to call JS (e.g. navigate, `setState`) from inside a worklet.

## Enter / exit / layout animations (great for screen & list transitions)

Replaces the manual mount fade in `Root.tsx` with one prop:

```tsx
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut} layout={LinearTransition}>
  …
</Animated.View>
```

Use `layout={LinearTransition}` on rows in `CreateTemplateScreen`/
`LogWorkoutScreen` so adding/removing a set animates the list smoothly.

## Derived values & scroll

```tsx
const offset = useSharedValue(0);
const onScroll = useAnimatedScrollHandler((e) => { offset.value = e.contentOffset.y; });
const headerStyle = useAnimatedStyle(() => ({
  opacity: interpolate(offset.value, [0, 80], [1, 0], Extrapolation.CLAMP),
}));
// <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />
```

## Gestures (drag, swipe-to-delete)

Needs Gesture Handler (not installed): `npx expo install react-native-gesture-handler`.
Wrap the app root in `GestureHandlerRootView`, then:

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const tx = useSharedValue(0);
const pan = Gesture.Pan()
  .onChange((e) => { tx.value += e.changeX; })
  .onEnd(() => { tx.value = withSpring(0); });
const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
// <GestureDetector gesture={pan}><Animated.View style={style} /></GestureDetector>
```

## Rules

- Mutate `.value`; read it only inside worklets (`useAnimatedStyle`/
  `useDerivedValue`) — reading `.value` during render is wrong.
- Keep durations ~150–250ms for UI feedback; springs for anything draggable/
  interruptible.
- Respect reduced-motion when adding non-essential motion.
- Reuse the design tokens (`colors`, `radius`) for animated styles too.
