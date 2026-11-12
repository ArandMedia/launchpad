import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectEditForm } from "./ProjectHeader";

describe("ProjectHeader", () => {
  it("uses a native project form without a sticky action layer", () => {
    const html = renderToStaticMarkup(
      <ProjectEditForm
        error=""
        onCancel={() => undefined}
        project={{
          id: "project-1",
          name: "Grizzly Drew",
          description: "Description",
          problem: "Problem",
          solution: "Solution",
          desiredOutcome: "Outcome",
          status: "IN_PROGRESS",
          startDate: null,
          targetDate: new Date("2026-12-31T00:00:00.000Z"),
          archivedAt: null,
        }}
      />,
    );

    expect(html).toContain('action="/api/projects/project-1"');
    expect(html).toContain('name="problem"');
    expect(html).toContain('value="2026-12-31"');
    expect(html).toContain("Save changes");
    expect(html).not.toContain("sticky");
  });
});
