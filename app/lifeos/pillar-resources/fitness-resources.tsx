"use client";

import { useState } from "react";
import ExercisePlanner from "./exercise-planner";
import WorkoutTracker from "./workout-tracker";
import type { PlannedWorkoutHandoff } from "@/lib/lifeos-exercises";

export default function FitnessResources() {
  const [plannedWorkout, setPlannedWorkout] = useState<PlannedWorkoutHandoff | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return <div className="space-y-5">
    <ExercisePlanner refreshKey={refreshKey} onLogPlan={setPlannedWorkout} />
    <WorkoutTracker plannedWorkout={plannedWorkout} onWorkoutSaved={() => { setPlannedWorkout(null); setRefreshKey((value) => value + 1); }} />
  </div>;
}
