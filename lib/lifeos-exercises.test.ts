import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG, exerciseInstruction, plannedWorkoutDuration, plannedWorkoutNotes, validateWorkoutPlanPayload } from "./lifeos-exercises";

describe("exercise catalog and workout plans", () => {
  const plan = { title: "Upper body", notes: "Controlled tempo", exercises: [{ itemId: "one", catalogId: "smith-bench-press", name: "Smith machine bench press", sets: 3, reps: "8–10", durationMinutes: null, notes: "" }, { itemId: "two", catalogId: "rs3-row-intervals", name: "RS3 rowing intervals", sets: null, reps: "", durationMinutes: 12, notes: "Moderate" }] };

  it("covers upper body, lower body, and cardio with the home-gym equipment", () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(new Set(EXERCISE_CATALOG.map((exercise) => exercise.category))).toEqual(new Set(["UPPER", "LOWER", "CARDIO"]));
    expect(EXERCISE_CATALOG.some((exercise) => exercise.equipment === "Merach RS3 rower")).toBe(true);
    expect(EXERCISE_CATALOG.some((exercise) => exercise.equipment === "SunHome Smith station")).toBe(true);
  });

  it("validates plans and turns them into a workout-log handoff", () => {
    expect(validateWorkoutPlanPayload(plan)).toBe(true);
    expect(plannedWorkoutDuration(plan)).toBe(20);
    expect(plannedWorkoutNotes(plan)).toContain("Smith machine bench press — 3 sets × 8–10");
  });

  it("provides an illustrated instruction sequence for every catalog exercise", () => {
    for (const exercise of EXERCISE_CATALOG) {
      const instruction = exerciseInstruction(exercise);
      expect(instruction.setup.length).toBeGreaterThan(20);
      expect(instruction.steps).toHaveLength(3);
      expect(instruction.watchFor.length).toBeGreaterThan(20);
    }
  });
});
