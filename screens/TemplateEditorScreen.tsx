import React from 'react';
import { View, StyleSheet, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Pill } from '../components/Pill';
import { colors, radius, spacing } from '../utils/theme';
import { useTemplateExercises } from '../api/queries/template';
import { useRemoveTemplateExercise } from '../api/mutations/template';
import {
  CatalogExercise,
  CatalogSearchResponse,
  formatMuscle,
} from '../api/schemas/catalog';
import type { ExerciseTemplate } from '../api/schemas/template';
import { useIsOnline } from '../lib/netinfo';

/**
 * Build an id→catalog lookup from whatever catalog search pages are already
 * cached (the picker populates them). The exercise-template DTO only carries a
 * title + `exerciseCatalogId`, so image/muscle come from here when available;
 * we always have the title as a fallback.
 */
function useCatalogIndex(): Map<string, CatalogExercise> {
  const qc = useQueryClient();
  const map = new Map<string, CatalogExercise>();
  const caches = qc.getQueriesData<{ pages: CatalogSearchResponse[] }>({
    queryKey: ['catalog'],
  });
  for (const [, data] of caches) {
    data?.pages?.forEach((page) =>
      page.exercises.forEach((ex) => map.set(ex.id, ex))
    );
  }
  return map;
}

export function TemplateEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useIsOnline();
  const { data: exercises, isLoading, isError, error } = useTemplateExercises(id);
  const remove = useRemoveTemplateExercise(id);
  const catalog = useCatalogIndex();

  const openPicker = () =>
    router.push({ pathname: '/catalog-picker', params: { templateId: id } });

  function confirmRemove(item: ExerciseTemplate) {
    Alert.alert('Remove exercise', `Remove "${item.title}" from this template?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => remove.mutate(item.id),
      },
    ]);
  }

  return (
    <Screen
      footer={
        <Button
          label={online ? '+ Add exercise' : 'Offline — add unavailable'}
          onPress={online ? openPicker : undefined}
          variant={online ? 'primary' : 'outline'}
        />
      }
    >
      <Header title="Template" onBack={() => router.back()} />

      {!online && (
        <View style={styles.offline}>
          <Body color={colors.textMuted} size={13}>
            You're offline. Templates are edited while connected.
          </Body>
        </View>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.coral} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Body color={colors.bad}>
            {error instanceof Error ? error.message : 'Could not load exercises'}
          </Body>
        </View>
      )}

      {exercises && exercises.length === 0 && (
        <View style={styles.center}>
          <Display size={26} style={styles.emptyTitle}>
            No exercises yet
          </Display>
          <Body color={colors.textFaint} style={styles.emptyText}>
            Add your first exercise from the catalog.
          </Body>
          {online && (
            <Pressable onPress={openPicker} style={styles.emptyCta}>
              <Body color={colors.coral} size={15}>
                + Add exercise
              </Body>
            </Pressable>
          )}
        </View>
      )}

      {exercises && exercises.length > 0 && (
        <View style={styles.list}>
          {exercises.map((item) => {
            const cat = item.exerciseCatalogId
              ? catalog.get(item.exerciseCatalogId)
              : undefined;
            return (
              <View key={item.id} style={styles.row}>
                {cat?.imageUrl ? (
                  <Image source={{ uri: cat.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]} />
                )}
                <View style={styles.rowBody}>
                  <Body size={16}>{item.title}</Body>
                  {cat && (
                    <Pill label={formatMuscle(cat.muscleGroup)} size={12} />
                  )}
                </View>
                <Pressable onPress={() => confirmRemove(item)} hitSlop={10}>
                  <Body color="#bbb" size={16}>
                    ✕
                  </Body>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  offline: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.pinkTint,
    borderWidth: 1,
    borderColor: colors.pinkStrong,
  },
  center: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: colors.ink },
  emptyText: { textAlign: 'center' },
  emptyCta: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  list: { marginTop: spacing.lg, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: 10,
  },
  rowBody: { flex: 1, gap: 4 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
  thumbPlaceholder: { backgroundColor: colors.track },
});
