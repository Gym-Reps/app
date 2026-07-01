import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Pill } from '../components/Pill';
import { colors, radius, font, spacing } from '../utils/theme';
import { useCatalogSearch } from '../api/queries/catalog';
import { useAddTemplateExercise } from '../api/mutations/template';
import {
  CatalogExercise,
  MUSCLE_GROUPS,
  MuscleGroup,
  formatMuscle,
} from '../api/schemas/catalog';
import { useIsOnline } from '../lib/netinfo';

/** Debounce a rapidly-changing value (search box) so we don't fetch per keystroke. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CatalogPickerScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const online = useIsOnline();

  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>(undefined);
  const debouncedQuery = useDebounced(query);

  const search = useCatalogSearch({ q: debouncedQuery, muscleGroup });
  const add = useAddTemplateExercise(templateId);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const items = useMemo(
    () => search.data?.pages.flatMap((page) => page.exercises) ?? [],
    [search.data]
  );

  async function handleAdd(exercise: CatalogExercise) {
    if (!online || add.isPending) return;
    try {
      await add.mutateAsync({ exerciseCatalogId: exercise.id });
      setAdded((prev) => new Set(prev).add(exercise.id));
    } catch {
      // The mutation surfaces the error; keep the picker open for a retry.
    }
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Display size={24} style={styles.title}>
          Add exercise
        </Display>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Body size={16} color={colors.coral}>
            Done
          </Body>
        </Pressable>
      </View>

      {!online && (
        <View style={styles.offline}>
          <Body color={colors.textMuted} size={13}>
            You're offline. Reconnect to add exercises.
          </Body>
        </View>
      )}

      <TextInput
        style={styles.search}
        placeholder="Search exercises"
        placeholderTextColor={colors.placeholder}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <ChipPill
          label="All"
          active={muscleGroup === undefined}
          onPress={() => setMuscleGroup(undefined)}
        />
        {MUSCLE_GROUPS.map((group) => (
          <ChipPill
            key={group}
            label={formatMuscle(group)}
            active={muscleGroup === group}
            onPress={() => setMuscleGroup(group)}
          />
        ))}
      </ScrollView>

      {search.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.coral} />
        </View>
      ) : search.isError ? (
        <View style={styles.center}>
          <Body color={colors.bad}>
            {search.error instanceof Error
              ? search.error.message
              : 'Could not load the catalog'}
          </Body>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Body color={colors.textFaint}>No exercises found</Body>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) {
              search.fetchNextPage();
            }
          }}
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <ActivityIndicator color={colors.coral} style={styles.footer} />
            ) : null
          }
          renderItem={({ item }) => {
            const isAdded = added.has(item.id);
            return (
              <Pressable
                onPress={() => handleAdd(item)}
                disabled={!online || add.isPending}
                style={({ pressed }) => [
                  styles.row,
                  pressed && online && styles.rowPressed,
                ]}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]} />
                )}
                <View style={styles.rowBody}>
                  <Body size={16}>{item.title}</Body>
                  <Pill label={formatMuscle(item.muscleGroup)} size={12} />
                </View>
                <Body color={isAdded ? colors.good : colors.coral} size={20}>
                  {isAdded ? '✓' : '+'}
                </Body>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

function ChipPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Pill label={label} tone={active ? 'dark' : 'neutral'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { color: colors.ink },
  offline: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.pinkTint,
    borderWidth: 1,
    borderColor: colors.pinkStrong,
  },
  search: {
    borderWidth: 1.5,
    borderColor: colors.placeholder,
    borderStyle: 'dashed',
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
  },
  chips: { gap: 8, paddingVertical: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  list: { gap: 12, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 10,
  },
  rowPressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
    borderColor: colors.coral,
  },
  rowBody: { flex: 1, gap: 4 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  thumbPlaceholder: { backgroundColor: colors.track },
  footer: { paddingVertical: spacing.lg },
});
