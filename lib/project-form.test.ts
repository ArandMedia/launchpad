import { describe, expect, it } from "vitest";
import { readProjectForm } from "@/lib/project-form";

describe("readProjectForm", () => {
  it("reads the live textarea values, including a cleared description", () => {
    const form = formWithValues({
      name: "  Grizzly Drew  ",
      description: "",
      problem: "Updated problem",
      solution: "Updated solution",
      desiredOutcome: "Updated outcome",
      status: "IN_PROGRESS",
      startDate: "2026-11-11",
      targetDate: "",
    });

    expect(readProjectForm(form)).toEqual({
      name: "Grizzly Drew",
      description: "",
      problem: "Updated problem",
      solution: "Updated solution",
      desiredOutcome: "Updated outcome",
      status: "IN_PROGRESS",
      startDate: "2026-11-11",
      targetDate: null,
    });
  });

  it("removes null characters that PostgreSQL cannot store", () => {
    const form = formWithValues({ description: "New\u0000 description" });

    expect(readProjectForm(form).description).toBe("New description");
  });
});

function formWithValues(values: Record<string, string>) {
  return {
    elements: {
      namedItem: (name: string) => name in values ? { value: values[name] } : null,
    },
  } as unknown as HTMLFormElement;
}
