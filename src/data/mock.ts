/**
 * Mock data shaped after the wireframe's "Data model — my take" note:
 *   exercise        — catalog entry with a target rep range (min/max)
 *   template        — a reusable plan: title + ordered exercises
 *   workout         — a performed session (a.k.a. "trainment")
 *   workoutSet      — one row PER SET (reps + weight), the source of every chart
 */

export type Exercise = {
  id: string;
  name: string;
  minReps: number;
  maxReps: number;
};

export type TemplateExercise = {
  exerciseId: string;
  minReps: number;
  maxReps: number;
};

export type Template = {
  id: string;
  title: string;
  emoji: string;
  exercises: TemplateExercise[];
  estMinutes: number;
};

export type WorkoutSet = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
};

export type Workout = {
  id: string;
  templateId: string;
  title: string;
  performedAt: string; // human label, e.g. "Jun 10"
  sets: WorkoutSet[];
};

export const exercises: Exercise[] = [
  { id: 'bench', name: 'Bench Press', minReps: 8, maxReps: 12 },
  { id: 'ohp', name: 'Overhead Press', minReps: 6, maxReps: 10 },
  { id: 'triceps', name: 'Triceps Pushdown', minReps: 12, maxReps: 15 },
  { id: 'incline', name: 'Incline DB Press', minReps: 8, maxReps: 12 },
  { id: 'squat', name: 'Back Squat', minReps: 5, maxReps: 8 },
  { id: 'deadlift', name: 'Deadlift', minReps: 3, maxReps: 6 },
  { id: 'row', name: 'Barbell Row', minReps: 8, maxReps: 12 },
  { id: 'curl', name: 'Bicep Curl', minReps: 10, maxReps: 15 },
];

export const exerciseName = (id: string) =>
  exercises.find((e) => e.id === id)?.name ?? id;

export const templates: Template[] = [
  {
    id: 'push',
    title: 'Push Day',
    emoji: '💥',
    estMinutes: 52,
    exercises: [
      { exerciseId: 'bench', minReps: 8, maxReps: 12 },
      { exerciseId: 'ohp', minReps: 6, maxReps: 10 },
      { exerciseId: 'triceps', minReps: 12, maxReps: 15 },
    ],
  },
  {
    id: 'pull',
    title: 'Pull Day',
    emoji: '🪝',
    estMinutes: 48,
    exercises: [
      { exerciseId: 'row', minReps: 8, maxReps: 12 },
      { exerciseId: 'curl', minReps: 10, maxReps: 15 },
    ],
  },
  {
    id: 'legs',
    title: 'Leg Day',
    emoji: '🦵',
    estMinutes: 55,
    exercises: [
      { exerciseId: 'squat', minReps: 5, maxReps: 8 },
      { exerciseId: 'deadlift', minReps: 3, maxReps: 6 },
    ],
  },
];

/** The two most recent Push sessions — used by Compare. */
export const workouts: Workout[] = [
  {
    id: 'w-jun10',
    templateId: 'push',
    title: 'Push Day',
    performedAt: 'Jun 10',
    sets: [
      { exerciseId: 'bench', setNumber: 1, reps: 12, weight: 60 },
      { exerciseId: 'bench', setNumber: 2, reps: 10, weight: 60 },
      { exerciseId: 'bench', setNumber: 3, reps: 8, weight: 60 },
      { exerciseId: 'ohp', setNumber: 1, reps: 8, weight: 40 },
      { exerciseId: 'ohp', setNumber: 2, reps: 9, weight: 40 },
      { exerciseId: 'ohp', setNumber: 3, reps: 6, weight: 42 },
      { exerciseId: 'triceps', setNumber: 1, reps: 15, weight: 22 },
      { exerciseId: 'triceps', setNumber: 2, reps: 13, weight: 22 },
    ],
  },
  {
    id: 'w-jun3',
    templateId: 'push',
    title: 'Push Day',
    performedAt: 'Jun 3',
    sets: [
      { exerciseId: 'bench', setNumber: 1, reps: 12, weight: 55 },
      { exerciseId: 'bench', setNumber: 2, reps: 10, weight: 55 },
      { exerciseId: 'bench', setNumber: 3, reps: 9, weight: 55 },
      { exerciseId: 'ohp', setNumber: 1, reps: 8, weight: 40 },
      { exerciseId: 'ohp', setNumber: 2, reps: 7, weight: 40 },
      { exerciseId: 'ohp', setNumber: 3, reps: 6, weight: 40 },
      { exerciseId: 'triceps', setNumber: 1, reps: 15, weight: 25 },
      { exerciseId: 'triceps', setNumber: 2, reps: 12, weight: 25 },
    ],
  },
];

/** Per-exercise progress series (top weight over recent sessions, kg). */
export const progressByExercise: Record<
  string,
  { points: number[]; pr: number; gain: number; months: string[] }
> = {
  bench: { points: [45, 47.5, 47.5, 52.5, 55, 57.5, 60], pr: 60, gain: 15, months: ['Apr', 'May', 'Jun'] },
  ohp: { points: [30, 32.5, 32.5, 35, 37.5, 40, 42], pr: 42, gain: 12, months: ['Apr', 'May', 'Jun'] },
  squat: { points: [80, 85, 90, 90, 95, 100, 100], pr: 100, gain: 20, months: ['Apr', 'May', 'Jun'] },
  triceps: { points: [20, 20, 22, 22, 25, 25, 22], pr: 25, gain: 2, months: ['Apr', 'May', 'Jun'] },
};

export const homeStats = {
  name: 'Alex',
  date: 'Wednesday · Jun 17',
  streak: 12,
  sessionsDone: 3,
  sessionsGoal: 4,
  volumeTons: 13.2,
  prs: 2,
  weeklyVolume: [42, 60, 52, 74, 94], // % heights for the mini bar chart
};
