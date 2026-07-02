import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addTemplateExercise,
  createTemplate,
  deleteTemplate,
  removeTemplateExercise,
  renameTemplate,
} from '../services/template';
import type {
  AddTemplateExerciseBody,
  CreateTemplateBody,
  ExerciseTemplate,
  TrainmentTemplate,
} from '../schemas/template';
import { QUERY_KEYS } from '../queryKeys';

/**
 * Template mutations. Each unwraps the service `Result` and throws on `Err` so
 * TanStack Query surfaces the error; `onSuccess` invalidates the affected cache
 * (the templates list, or a template's exercise slots) so the UI refreshes
 * without a manual refetch.
 */

/** POST /trainment-templates — on success invalidate the templates list. */
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation<TrainmentTemplate, Error, CreateTemplateBody>({
    mutationFn: async (body) => {
      const res = await createTemplate(body);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEMPLATES() });
    },
  });
}

/** PATCH /trainment-templates/:id — rename, then invalidate the templates list. */
export function useRenameTemplate() {
  const qc = useQueryClient();
  return useMutation<TrainmentTemplate, Error, { id: string; title: string }>({
    mutationFn: async ({ id, title }) => {
      const res = await renameTemplate(id, title);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEMPLATES() });
    },
  });
}

/**
 * DELETE /trainment-templates/:id — optimistically drop the row from the
 * `['templates']` cache, roll back on error, and re-sync on settle.
 */
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    string,
    { previous?: TrainmentTemplate[] }
  >({
    mutationFn: async (id) => {
      const res = await deleteTemplate(id);
      if (!res.ok) throw new Error(res.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.TEMPLATES() });
      const previous = qc.getQueryData<TrainmentTemplate[]>(QUERY_KEYS.TEMPLATES());
      qc.setQueryData<TrainmentTemplate[]>(QUERY_KEYS.TEMPLATES(), (old) =>
        (old ?? []).filter((t) => t.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(QUERY_KEYS.TEMPLATES(), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEMPLATES() });
    },
  });
}

/** POST /trainment-templates/:id/exercises — invalidate this template's slots. */
export function useAddTemplateExercise(templateId: string) {
  const qc = useQueryClient();
  return useMutation<ExerciseTemplate, Error, AddTemplateExerciseBody>({
    mutationFn: async (body) => {
      const res = await addTemplateExercise(templateId, body);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEMPLATE_EXERCISES(templateId) });
    },
  });
}

/** DELETE /exercise-templates/:id — invalidate this template's slots. */
export function useRemoveTemplateExercise(templateId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (exerciseTemplateId) => {
      const res = await removeTemplateExercise(exerciseTemplateId);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TEMPLATE_EXERCISES(templateId) });
    },
  });
}
