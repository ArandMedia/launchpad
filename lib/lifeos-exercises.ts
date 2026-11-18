export const EXERCISE_CATEGORIES = ["UPPER", "LOWER", "CARDIO"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_KINDS = ["STRENGTH", "CARDIO"] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export type CatalogExercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  kind: ExerciseKind;
  muscleGroup: string;
  equipment: string;
  pattern: string;
  guidance: string;
};

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Upper body — built around the SunHome Smith/cable station, bench, plates, and free weights.
  { id: "smith-bench-press", name: "Smith machine bench press", category: "UPPER", kind: "STRENGTH", muscleGroup: "Chest", equipment: "SunHome Smith station", pattern: "Horizontal push", guidance: "Set the bench and safety stops before loading, keep the upper back supported, and lower the bar under control." },
  { id: "smith-incline-press", name: "Smith machine incline press", category: "UPPER", kind: "STRENGTH", muscleGroup: "Upper chest", equipment: "SunHome Smith station", pattern: "Incline push", guidance: "Use a modest bench angle, keep wrists stacked, and stop at a comfortable shoulder depth." },
  { id: "smith-overhead-press", name: "Smith machine overhead press", category: "UPPER", kind: "STRENGTH", muscleGroup: "Shoulders", equipment: "SunHome Smith station", pattern: "Vertical push", guidance: "Set the bench upright, brace the trunk, and press without over-arching the low back." },
  { id: "lat-pulldown", name: "Lat pulldown", category: "UPPER", kind: "STRENGTH", muscleGroup: "Back", equipment: "SunHome lat station", pattern: "Vertical pull", guidance: "Pull toward the upper chest while keeping the torso stable and shoulders away from the ears." },
  { id: "seated-cable-row", name: "Seated cable row", category: "UPPER", kind: "STRENGTH", muscleGroup: "Back", equipment: "SunHome cable station", pattern: "Horizontal pull", guidance: "Sit tall and draw the handle toward the ribs without rocking the torso." },
  { id: "cable-chest-fly", name: "Cable chest fly", category: "UPPER", kind: "STRENGTH", muscleGroup: "Chest", equipment: "SunHome cable station", pattern: "Adduction", guidance: "Use a light, controllable load and bring the hands together without forcing the shoulders forward." },
  { id: "cable-face-pull", name: "Cable face pull", category: "UPPER", kind: "STRENGTH", muscleGroup: "Upper back", equipment: "SunHome cable station", pattern: "Horizontal pull", guidance: "Pull toward eye level and finish with the upper arms comfortably open." },
  { id: "triceps-pressdown", name: "Triceps pressdown", category: "UPPER", kind: "STRENGTH", muscleGroup: "Triceps", equipment: "SunHome cable station", pattern: "Elbow extension", guidance: "Keep the elbows near the sides and extend without moving the shoulders." },
  { id: "cable-biceps-curl", name: "Cable biceps curl", category: "UPPER", kind: "STRENGTH", muscleGroup: "Biceps", equipment: "SunHome cable station", pattern: "Elbow flexion", guidance: "Keep the upper arms still and avoid leaning back as the handle rises." },
  { id: "dumbbell-bench-press", name: "Dumbbell bench press", category: "UPPER", kind: "STRENGTH", muscleGroup: "Chest", equipment: "Free weights + bench", pattern: "Horizontal push", guidance: "Keep the upper back supported and lower both weights through a comfortable, controlled range." },
  { id: "one-arm-dumbbell-row", name: "One-arm dumbbell row", category: "UPPER", kind: "STRENGTH", muscleGroup: "Back", equipment: "Free weights + bench", pattern: "Horizontal pull", guidance: "Keep the trunk quiet and draw the elbow toward the hip." },
  { id: "dumbbell-shoulder-press", name: "Dumbbell shoulder press", category: "UPPER", kind: "STRENGTH", muscleGroup: "Shoulders", equipment: "Free weights", pattern: "Vertical push", guidance: "Brace the trunk and press overhead without shrugging or arching the low back." },
  { id: "dumbbell-lateral-raise", name: "Dumbbell lateral raise", category: "UPPER", kind: "STRENGTH", muscleGroup: "Shoulders", equipment: "Free weights", pattern: "Raise", guidance: "Use a light load and raise smoothly without swinging." },
  { id: "dumbbell-biceps-curl", name: "Dumbbell biceps curl", category: "UPPER", kind: "STRENGTH", muscleGroup: "Biceps", equipment: "Free weights", pattern: "Elbow flexion", guidance: "Keep the upper arms still and control both the lift and lowering phase." },
  { id: "push-up", name: "Push-up", category: "UPPER", kind: "STRENGTH", muscleGroup: "Chest", equipment: "Bodyweight", pattern: "Horizontal push", guidance: "Keep a straight line from head to heels and use a hand position comfortable for the shoulders." },

  // Lower body — Smith station, leg press, plates, bench, and free weights.
  { id: "smith-back-squat", name: "Smith machine squat", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "SunHome Smith station", pattern: "Squat", guidance: "Set the safety stops, keep the whole foot grounded, and use a stance that lets the knees track with the toes." },
  { id: "smith-romanian-deadlift", name: "Smith Romanian deadlift", category: "LOWER", kind: "STRENGTH", muscleGroup: "Hamstrings + glutes", equipment: "SunHome Smith station", pattern: "Hinge", guidance: "Push the hips back with a neutral spine and keep the bar close to the legs." },
  { id: "smith-split-squat", name: "Smith split squat", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "SunHome Smith station", pattern: "Single-leg squat", guidance: "Set the feet before unlocking the bar and lower under control through a comfortable range." },
  { id: "smith-hip-thrust", name: "Smith hip thrust", category: "LOWER", kind: "STRENGTH", muscleGroup: "Glutes", equipment: "SunHome Smith station", pattern: "Hinge", guidance: "Pad the bar, drive through the feet, and finish with ribs stacked over the pelvis." },
  { id: "leg-press", name: "Leg press", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "SunHome leg press", pattern: "Squat", guidance: "Keep the hips supported, lower only as far as control allows, and avoid locking the knees forcefully." },
  { id: "barbell-deadlift", name: "Barbell deadlift", category: "LOWER", kind: "STRENGTH", muscleGroup: "Posterior chain", equipment: "Free weights", pattern: "Hinge", guidance: "Brace before lifting, keep the bar close, and stand without leaning back." },
  { id: "goblet-squat", name: "Goblet squat", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "Free weights", pattern: "Squat", guidance: "Hold the weight close to the chest and keep knees tracking with the toes." },
  { id: "dumbbell-reverse-lunge", name: "Dumbbell reverse lunge", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "Free weights", pattern: "Lunge", guidance: "Step back under control and drive through the front foot to return." },
  { id: "dumbbell-step-up", name: "Dumbbell step-up", category: "LOWER", kind: "STRENGTH", muscleGroup: "Quads + glutes", equipment: "Free weights + bench", pattern: "Single-leg squat", guidance: "Use a stable platform, place the whole foot on it, and rise without pushing off the trailing leg." },
  { id: "single-leg-romanian-deadlift", name: "Single-leg Romanian deadlift", category: "LOWER", kind: "STRENGTH", muscleGroup: "Hamstrings + glutes", equipment: "Free weights", pattern: "Single-leg hinge", guidance: "Keep the hips level and use a support for balance when needed." },
  { id: "standing-calf-raise", name: "Standing calf raise", category: "LOWER", kind: "STRENGTH", muscleGroup: "Calves", equipment: "Free weights", pattern: "Ankle extension", guidance: "Use a full comfortable range and pause briefly at the top." },
  { id: "bodyweight-glute-bridge", name: "Glute bridge", category: "LOWER", kind: "STRENGTH", muscleGroup: "Glutes", equipment: "Bodyweight", pattern: "Hinge", guidance: "Drive through the feet and stop before the low back begins to arch." },

  // Cardio — the user's rower, treadmill, and bike.
  { id: "rs3-steady-row", name: "RS3 steady row", category: "CARDIO", kind: "CARDIO", muscleGroup: "Full body", equipment: "Merach RS3 rower", pattern: "Steady aerobic", guidance: "Drive with the legs before finishing with the trunk and arms, using a resistance you can sustain." },
  { id: "rs3-row-intervals", name: "RS3 rowing intervals", category: "CARDIO", kind: "CARDIO", muscleGroup: "Full body", equipment: "Merach RS3 rower", pattern: "Intervals", guidance: "Alternate work and easy-recovery periods while keeping the stroke controlled as fatigue builds." },
  { id: "rs3-easy-recovery-row", name: "RS3 recovery row", category: "CARDIO", kind: "CARDIO", muscleGroup: "Full body", equipment: "Merach RS3 rower", pattern: "Recovery aerobic", guidance: "Use light resistance and an easy conversational pace to support recovery." },
  { id: "treadmill-walk", name: "Treadmill walk", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Treadmill", pattern: "Steady aerobic", guidance: "Choose a comfortable speed and avoid holding the rails unless needed for balance." },
  { id: "treadmill-incline-walk", name: "Treadmill incline walk", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Treadmill", pattern: "Incline aerobic", guidance: "Increase incline gradually while keeping posture tall and the pace controllable." },
  { id: "treadmill-run", name: "Treadmill run", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Treadmill", pattern: "Steady aerobic", guidance: "Use a sustainable pace and build duration gradually." },
  { id: "treadmill-run-walk", name: "Treadmill run/walk intervals", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Treadmill", pattern: "Intervals", guidance: "Alternate repeatable running and walking periods rather than sprinting to exhaustion." },
  { id: "bike-steady-ride", name: "Bike steady ride", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Bike", pattern: "Steady aerobic", guidance: "Set the seat for a comfortable pedal stroke and use resistance you can sustain." },
  { id: "bike-intervals", name: "Bike intervals", category: "CARDIO", kind: "CARDIO", muscleGroup: "Lower body", equipment: "Bike", pattern: "Intervals", guidance: "Alternate firm work with easy pedaling while keeping the cadence controlled." },
];

export const EXERCISE_MUSCLE_GROUPS = [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.muscleGroup))].sort();
export const EXERCISE_EQUIPMENT = [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.equipment))].sort();

export type PlannedExercise = { itemId: string; catalogId: string; name: string; sets: number | null; reps: string; durationMinutes: number | null; notes: string };
export type WorkoutPlanPayload = { title: string; notes: string; exercises: PlannedExercise[] };
export type PlannedWorkoutHandoff = { planId: string; title: string; scheduledFor: string; durationMinutes: number; notes: string };

export function validateWorkoutPlanPayload(value: unknown): value is WorkoutPlanPayload {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  if (typeof plan.title !== "string" || !plan.title.trim() || plan.title.length > 160 || typeof plan.notes !== "string" || plan.notes.length > 2000 || !Array.isArray(plan.exercises) || plan.exercises.length < 1 || plan.exercises.length > 50) return false;
  return plan.exercises.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const exercise = entry as Record<string, unknown>;
    return typeof exercise.itemId === "string" && exercise.itemId.length > 0 && exercise.itemId.length <= 100
      && typeof exercise.catalogId === "string" && exercise.catalogId.length > 0 && exercise.catalogId.length <= 100
      && typeof exercise.name === "string" && exercise.name.length > 0 && exercise.name.length <= 160
      && (exercise.sets === null || (typeof exercise.sets === "number" && Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 100))
      && typeof exercise.reps === "string" && exercise.reps.length <= 40
      && (exercise.durationMinutes === null || (typeof exercise.durationMinutes === "number" && Number.isInteger(exercise.durationMinutes) && exercise.durationMinutes >= 1 && exercise.durationMinutes <= 1440))
      && typeof exercise.notes === "string" && exercise.notes.length <= 500;
  });
}

export function plannedWorkoutDuration(plan: WorkoutPlanPayload) {
  return Math.max(15, plan.exercises.reduce((total, exercise) => total + (exercise.durationMinutes ?? 8), 0));
}

export function plannedWorkoutNotes(plan: WorkoutPlanPayload) {
  const lines = plan.exercises.map((exercise) => {
    const prescription = [exercise.sets ? `${exercise.sets} sets` : "", exercise.reps ? `× ${exercise.reps}` : "", exercise.durationMinutes ? `${exercise.durationMinutes} min` : ""].filter(Boolean).join(" ");
    return `• ${exercise.name}${prescription ? ` — ${prescription}` : ""}${exercise.notes ? ` (${exercise.notes})` : ""}`;
  });
  return [`Planned session: ${plan.title}`, ...lines, plan.notes].filter(Boolean).join("\n");
}
