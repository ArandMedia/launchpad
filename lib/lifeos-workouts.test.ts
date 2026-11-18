import { describe, expect, it } from "vitest";
import { estimateWorkoutCalories, validateWorkoutPayload, workoutActivityLabel, workoutMet } from "./lifeos-workouts";

describe("workout calculations", () => {
  it("uses MET, body weight, and duration for a repeatable calorie estimate", () => {
    expect(estimateWorkoutCalories(5, 220.46226218, 60)).toBe(500);
    expect(estimateWorkoutCalories(5, 0, 60)).toBe(0);
  });

  it("uses the selected activity and intensity while allowing a custom label", () => {
    expect(workoutMet("STRENGTH", "MODERATE")).toBe(5);
    expect(workoutActivityLabel("OTHER", "Rucking")).toBe("Rucking");
  });

  it("rejects malformed stored workout data", () => {
    expect(validateWorkoutPayload({ activityKey: "RUNNING" })).toBe(false);
  });
});
