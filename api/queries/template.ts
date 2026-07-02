import { useQuery } from '@tanstack/react-query';
import { listTemplateExercises, listTemplates } from '../services/template';
import { QUERY_KEYS } from '../queryKeys';

/** The user's active templates. Keyed `['templates']`. */
export function useTemplates() {
  return useQuery({
    queryKey: QUERY_KEYS.TEMPLATES(),
    queryFn: async () => {
      const res = await listTemplates();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

/** A template's active exercise slots. Keyed `['template', id, 'exercises']`. */
export function useTemplateExercises(templateId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TEMPLATE_EXERCISES(templateId),
    queryFn: async () => {
      const res = await listTemplateExercises(templateId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!templateId,
  });
}
