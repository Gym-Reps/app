import { useQuery } from '@tanstack/react-query';
import { listTemplateExercises } from '../services/template';

/** A template's active exercise slots. Keyed `['template', id, 'exercises']`. */
export function useTemplateExercises(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId, 'exercises'],
    queryFn: async () => {
      const res = await listTemplateExercises(templateId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!templateId,
  });
}
