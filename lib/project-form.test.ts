import { describe, expect, it } from "vitest";
import { readProjectForm } from "@/lib/project-form";

describe("readProjectForm", () => {
  it("reads the live textarea values, including a cleared description", () => {
    const form = new FormData();
    form.set("name", "  Grizzly Drew  ");
    form.set("description", "");
    form.set("problem", "Updated problem");
    form.set("solution", "Updated solution");
    form.set("desiredOutcome", "Updated outcome");
    form.set("status", "IN_PROGRESS");
    form.set("startDate", "2026-11-11");
    form.set("targetDate", "");

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
    const form = new FormData();
    form.set("description", "New\u0000 description");

    expect(readProjectForm(form).description).toBe("New description");
  });
});
