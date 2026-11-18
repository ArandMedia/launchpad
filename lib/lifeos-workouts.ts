export const WORKOUT_INTENSITIES = ["LIGHT", "MODERATE", "VIGOROUS"] as const;
export type WorkoutIntensity = (typeof WORKOUT_INTENSITIES)[number];

export const WORKOUT_ACTIVITIES = [
  { key: "STRENGTH", label: "Strength training", mets: { LIGHT: 3.5, MODERATE: 5, VIGOROUS: 6 } },
  { key: "WALKING", label: "Walking", mets: { LIGHT: 2.8, MODERATE: 3.8, VIGOROUS: 5 } },
  { key: "RUNNING", label: "Running", mets: { LIGHT: 6, MODERATE: 9.8, VIGOROUS: 12.3 } },
  { key: "CYCLING", label: "Cycling", mets: { LIGHT: 4, MODERATE: 7.5, VIGOROUS: 10 } },
  { key: "SWIMMING", label: "Swimming", mets: { LIGHT: 5, MODERATE: 7, VIGOROUS: 9.8 } },
  { key: "ROWING", label: "Rowing", mets: { LIGHT: 4.8, MODERATE: 7, VIGOROUS: 8.5 } },
  { key: "HIIT", label: "HIIT / circuits", mets: { LIGHT: 5, MODERATE: 8, VIGOROUS: 10 } },
  { key: "YOGA", label: "Yoga / mobility", mets: { LIGHT: 2.3, MODERATE: 3, VIGOROUS: 4 } },
  { key: "SPORT", label: "Sports", mets: { LIGHT: 4.5, MODERATE: 7, VIGOROUS: 9 } },
  { key: "OTHER", label: "Other workout", mets: { LIGHT: 3, MODERATE: 5, VIGOROUS: 7 } },
] as const;

export type WorkoutActivityKey = (typeof WORKOUT_ACTIVITIES)[number]["key"];
export type WorkoutCalorieSource = "ESTIMATED" | "MANUAL";

export type WorkoutPayload = {
  activityKey: WorkoutActivityKey;
  activityLabel: string;
  intensity: WorkoutIntensity;
  durationMinutes: number;
  bodyWeightLbs: number;
  met: number;
  estimatedCalories: number;
  caloriesBurned: number;
  calorieSource: WorkoutCalorieSource;
  notes: string;
  planId?: string;
};

export function isWorkoutActivityKey(value: unknown): value is WorkoutActivityKey {
  return typeof value === "string" && WORKOUT_ACTIVITIES.some((activity) => activity.key === value);
}

export function isWorkoutIntensity(value: unknown): value is WorkoutIntensity {
  return typeof value === "string" && WORKOUT_INTENSITIES.includes(value as WorkoutIntensity);
}

export function workoutMet(activityKey: WorkoutActivityKey, intensity: WorkoutIntensity) {
  return WORKOUT_ACTIVITIES.find((activity) => activity.key === activityKey)!.mets[intensity];
}

export function workoutActivityLabel(activityKey: WorkoutActivityKey, customLabel = "") {
  if (activityKey === "OTHER" && customLabel.trim()) return customLabel.trim().slice(0, 120);
  return WORKOUT_ACTIVITIES.find((activity) => activity.key === activityKey)!.label;
}

// The standard MET estimate: kcal = MET × body weight (kg) × duration (hours).
// It is useful for directional tracking, not a clinical or device-grade reading.
export function estimateWorkoutCalories(met: number, bodyWeightLbs: number, durationMinutes: number) {
  if (![met, bodyWeightLbs, durationMinutes].every(Number.isFinite) || met <= 0 || bodyWeightLbs <= 0 || durationMinutes <= 0) return 0;
  return Math.max(1, Math.round(met * (bodyWeightLbs / 2.2046226218) * (durationMinutes / 60)));
}

export function validateWorkoutPayload(value: unknown): value is WorkoutPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return isWorkoutActivityKey(payload.activityKey)
    && typeof payload.activityLabel === "string" && payload.activityLabel.length > 0 && payload.activityLabel.length <= 120
    && isWorkoutIntensity(payload.intensity)
    && typeof payload.durationMinutes === "number" && Number.isInteger(payload.durationMinutes) && payload.durationMinutes >= 1 && payload.durationMinutes <= 1440
    && typeof payload.bodyWeightLbs === "number" && payload.bodyWeightLbs >= 40 && payload.bodyWeightLbs <= 1000
    && typeof payload.met === "number" && payload.met >= 1 && payload.met <= 25
    && typeof payload.estimatedCalories === "number" && Number.isInteger(payload.estimatedCalories) && payload.estimatedCalories >= 1 && payload.estimatedCalories <= 500000
    && typeof payload.caloriesBurned === "number" && Number.isInteger(payload.caloriesBurned) && payload.caloriesBurned >= 1 && payload.caloriesBurned <= 500000
    && (payload.calorieSource === "ESTIMATED" || payload.calorieSource === "MANUAL")
    && typeof payload.notes === "string" && payload.notes.length <= 2000
    && (payload.planId === undefined || (typeof payload.planId === "string" && payload.planId.length <= 100));
}
