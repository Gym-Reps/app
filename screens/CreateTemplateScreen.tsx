import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Body } from '../components/Text';
import { Header } from '../components/Header';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { colors } from '../utils/theme';
import { useRouter } from 'expo-router';
import { useCreateTemplate } from '../api/mutations/template';

/**
 * Step 1 of building a workout plan: name a new template. On create we replace
 * this route with the editor (`/template/:id`) so Back doesn't return to the
 * empty form, and the templates list is invalidated by the mutation.
 */
export function CreateTemplateScreen() {
  const router = useRouter();
  const create = useCreateTemplate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (create.isPending) return;
    setError(null);

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError('Give your template a name.');
      return;
    }

    try {
      const template = await create.mutateAsync({ title: trimmed });
      router.replace(`/template/${template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create template');
    }
  }

  return (
    <Screen>
      <Header title="New template" onBack={() => router.back()} />
      <Body color={colors.textFaint} style={styles.sub}>
        Name it now — add exercises next.
      </Body>

      <View style={styles.form}>
        <Field
          label="Template name"
          placeholder="e.g. Upper A"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <Button
          label={create.isPending ? 'Creating…' : 'Create template'}
          onPress={handleCreate}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6 },
  form: { marginTop: 18, gap: 16 },
  cta: { marginTop: 6 },
  error: {
    color: colors.bad,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderColor: colors.bad,
  },
});
