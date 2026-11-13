import { nowInChicago } from "@/lib/lifeos-time";

export const DECISION_QUADRANTS = ["DO_NOW", "SCHEDULE", "DELEGATE", "ELIMINATE"] as const;
export const DECISION_SOURCE_KINDS = ["PROJECT_TASK", "MILESTONE", "NEXT_ACTION"] as const;

export type DecisionQuadrant = (typeof DECISION_QUADRANTS)[number];
export type DecisionSourceKind = (typeof DECISION_SOURCE_KINDS)[number];

export function currentDecisionDate(now = new Date()) {
  return nowInChicago(now).slice(0, 10);
}

export function parseDecisionDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function isDecisionQuadrant(value: unknown): value is DecisionQuadrant {
  return typeof value === "string" && DECISION_QUADRANTS.includes(value as DecisionQuadrant);
}

export function isDecisionSourceKind(value: unknown): value is DecisionSourceKind {
  return typeof value === "string" && DECISION_SOURCE_KINDS.includes(value as DecisionSourceKind);
}

export function decisionItemKey(sourceKind: DecisionSourceKind, sourceId: string) {
  return `${sourceKind}:${sourceId}`;
}
