import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Body, Display } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { SkeletonCard } from '../components/Skeleton';
import { colors, radius, spacing } from '../utils/theme';
import { useTemplates } from '../api/queries/template';
import { useDeleteTemplate, useRenameTemplate } from '../api/mutations/template';
import { listTemplateExercises } from '../api/services/template';
import type { TrainmentTemplate } from '../api/schemas/template';
import { useActiveTrainment } from '../stores/activeTrainment';

/**
 * Small local "time ago" helper — the spec explicitly forbids adding a dep just
 * for relative time. Falls back to an empty string for missing/invalid dates.
 */
function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export function TemplatesScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTemplates();
  const rename = useRenameTemplate();
  const del = useDeleteTemplate();

  // Transient UI: which template is being renamed + the draft title.
  const [renaming, setRenaming] = useState<TrainmentTemplate | null>(null);
  const [draft, setDraft] = useState('');

  // Start a workout: fetch the template's exercise slots, seed the offline
  // active-session store (slice 05), then open the live log. If a session is
  // already in progress, offer to resume it or discard and start fresh.
  async function beginSession(t: TrainmentTemplate) {
    const res = await listTemplateExercises(t.id);
    if (!res.ok) {
      Alert.alert('Could not start', res.error);
      return;
    }
    if (res.data.length === 0) {
      Alert.alert(
        'Empty template',
        `"${t.title}" has no exercises yet. Add some before starting.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => router.push(`/template/${t.id}`) },
        ]
      );
      return;
    }
    useActiveTrainment.getState().startFromTemplate({
      templateId: t.id,
      exercises: res.data.map((et) => ({
        exerciseTemplateId: et.id,
        title: et.title,
      })),
    });
    router.push('/log-workout');
  }

  function handleStart(t: TrainmentTemplate) {
    const store = useActiveTrainment.getState();
    if (store.active) {
      Alert.alert(
        'Workout in progress',
        'You already have an active session. Resume it, or discard it to start this one?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resume', onPress: () => router.push('/log-workout') },
          {
            text: 'Discard & start',
            style: 'destructive',
            onPress: () => {
              store.discard();
              void beginSession(t);
            },
          },
        ]
      );
      return;
    }
    void beginSession(t);
  }

  function handleEdit(id: string) {
    router.push(`/template/${id}`);
  }

  function handleDelete(t: TrainmentTemplate) {
    Alert.alert(
      'Delete template?',
      `"${t.title}" will be removed. Past workouts you logged from it are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            del.mutate(t.id, {
              onError: (err) =>
                Alert.alert(
                  'Could not delete',
                  err instanceof Error ? err.message : 'Please try again.'
                ),
            });
          },
        },
      ]
    );
  }

  function openRename(t: TrainmentTemplate) {
    setRenaming(t);
    setDraft(t.title);
  }

  function submitRename() {
    if (!renaming) return;
    const title = draft.trim();
    if (title.length === 0 || title === renaming.title) {
      setRenaming(null);
      return;
    }
    rename.mutate(
      { id: renaming.id, title },
      {
        onError: (err) =>
          Alert.alert(
            'Could not rename',
            err instanceof Error ? err.message : 'Please try again.'
          ),
      }
    );
    setRenaming(null);
  }

  const templates = data ?? [];

  return (
    <Screen scroll={false}>
      <View style={styles.head}>
        <Display size={28}>Templates</Display>
        <Body color={colors.textFaint} size={13}>
          Reusable workout plans
        </Body>
      </View>

      {isLoading && templates.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard height={150} />
          <SkeletonCard height={150} />
          <SkeletonCard height={150} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.coral}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Display size={22}>No templates yet</Display>
              <Body color={colors.textFaint} size={14} style={styles.emptySub}>
                Create your first reusable workout plan.
              </Body>
              <Button
                label="+ New template"
                onPress={() => router.push('/create-template')}
                style={styles.emptyCta}
              />
            </View>
          }
          renderItem={({ item }) => {
            const updated = formatRelative(item.updatedAt ?? item.createdAt);
            return (
              <Card strong shadow style={styles.card}>
                <View style={styles.cardHead}>
                  <Display size={24} numberOfLines={1} style={styles.cardTitle}>
                    {item.title}
                  </Display>
                  {updated.length > 0 && (
                    <Body color={colors.textFaint} size={12}>
                      updated {updated}
                    </Body>
                  )}
                </View>

                <View style={styles.actions}>
                  <Button
                    label="Start"
                    onPress={() => handleStart(item)}
                    style={styles.actionStart}
                  />
                  <Button
                    label="Edit"
                    variant="outline"
                    onPress={() => handleEdit(item.id)}
                    style={styles.action}
                  />
                  <Button
                    label="Delete"
                    variant="danger"
                    onPress={() => handleDelete(item)}
                    style={styles.action}
                  />
                </View>

                <Pressable onPress={() => openRename(item)} hitSlop={8}>
                  <Body color={colors.textMuted} size={13} style={styles.rename}>
                    Rename
                  </Body>
                </Pressable>
              </Card>
            );
          }}
          ListFooterComponent={
            templates.length > 0 ? (
              <Pressable onPress={() => router.push('/create-template')}>
                <View style={styles.add}>
                  <Body color={colors.coral} size={15}>
                    + New template
                  </Body>
                </View>
              </Pressable>
            ) : null
          }
        />
      )}

      <Modal
        visible={renaming != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenaming(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Display size={22}>Rename template</Display>
            <Field
              label="Template name"
              placeholder="e.g. Upper A"
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="sentences"
            />
            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setRenaming(null)}
                style={styles.sheetBtn}
              />
              <Button
                label={rename.isPending ? 'Saving…' : 'Save'}
                onPress={submitRename}
                style={styles.sheetBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing.lg },
  skeletons: { gap: spacing.lg },
  listContent: { gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionStart: { flex: 1.4 },
  action: { flex: 1 },
  rename: { alignSelf: 'flex-start', textDecorationLine: 'underline' },
  add: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.coral,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  empty: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptySub: { textAlign: 'center' },
  emptyCta: { marginTop: spacing.md, alignSelf: 'stretch' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,43,43,0.35)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sheetActions: { flexDirection: 'row', gap: spacing.md },
  sheetBtn: { flex: 1 },
});
