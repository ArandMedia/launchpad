export const HEALTH_CHECK_IN_METRICS = [
  { key: "sleep_duration_hours", name: "Sleep duration", unit: "hours", min: 0, max: 24, step: 0.1, group: "Sleep totals" },
  { key: "time_in_bed_hours", name: "Time in bed", unit: "hours", min: 0, max: 24, step: 0.1, group: "Sleep totals" },
  { key: "sleep_score", name: "Sleep score", unit: "score", min: 0, max: 100, step: 1, group: "Sleep totals" },
  { key: "sleep_efficiency_pct", name: "Sleep efficiency", unit: "%", min: 0, max: 100, step: 0.1, group: "Sleep totals" },
  { key: "rem_minutes", name: "REM sleep", unit: "min", min: 0, max: 720, step: 1, group: "Sleep stages" },
  { key: "deep_minutes", name: "Deep sleep", unit: "min", min: 0, max: 720, step: 1, group: "Sleep stages" },
  { key: "core_minutes", name: "Core / light sleep", unit: "min", min: 0, max: 1000, step: 1, group: "Sleep stages" },
  { key: "awake_minutes", name: "Awake time", unit: "min", min: 0, max: 1000, step: 1, group: "Sleep stages" },
  { key: "sleep_latency_minutes", name: "Sleep latency", unit: "min", min: 0, max: 300, step: 1, group: "Sleep continuity" },
  { key: "awakenings", name: "Awakenings", unit: "count", min: 0, max: 100, step: 1, group: "Sleep continuity" },
  { key: "resting_heart_rate", name: "Resting heart rate", unit: "bpm", min: 20, max: 220, step: 1, group: "Recovery" },
  { key: "hrv_ms", name: "Heart-rate variability", unit: "ms", min: 0, max: 500, step: 1, group: "Recovery" },
  { key: "respiratory_rate", name: "Respiratory rate", unit: "breaths/min", min: 4, max: 60, step: 0.1, group: "Recovery" },
  { key: "spo2_pct", name: "Blood oxygen", unit: "%", min: 50, max: 100, step: 0.1, group: "Recovery" },
  { key: "temperature_deviation_c", name: "Temperature deviation", unit: "°C", min: -10, max: 10, step: 0.01, group: "Recovery" },
  { key: "steps", name: "Steps", unit: "steps", min: 0, max: 100000, step: 1, group: "Daily context" },
  { key: "active_energy_kcal", name: "Active energy", unit: "kcal", min: 0, max: 10000, step: 1, group: "Daily context" },
  { key: "weight_lb", name: "Weight", unit: "lb", min: 20, max: 1000, step: 0.1, group: "Daily context" },
  { key: "subjective_energy", name: "Subjective energy", unit: "1–5", min: 1, max: 5, step: 1, group: "Daily context" },
] as const;

export type HealthMetricKey = (typeof HEALTH_CHECK_IN_METRICS)[number]["key"];

export function validateHealthCheckIn(values: unknown) {
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  const input = values as Record<string, unknown>;
  const validated: Partial<Record<HealthMetricKey, number>> = {};
  for (const metric of HEALTH_CHECK_IN_METRICS) {
    const raw = input[metric.key];
    if (raw === "" || raw === null || raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < metric.min || value > metric.max) return null;
    validated[metric.key] = value;
  }
  return Object.keys(validated).length ? validated : null;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
