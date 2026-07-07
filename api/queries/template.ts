import { useQuery } from '@tanstack/react-query';
import { listTemplateExercises, listTrainmentTemplates } from '../services/template';
import { QUERY_KEYS } from '../queryKeys';

export function useTemplates() {
  return useQuery({
    queryKey: QUERY_KEYS.TEMPLATES(),
    queryFn: async () => {
      const res = await listTrainmentTemplates();
      if (!res.ok) return [];
      return res.data;
    },
  });
}

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
