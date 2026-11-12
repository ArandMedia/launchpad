import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./LogoutButton", () => ({ default: () => <button>Sign out</button> }));

import LaunchpadHeader from "./LaunchpadHeader";

describe("LaunchpadHeader", () => {
  it("keeps navigation out of a sticky WebKit interaction layer", () => {
    const html = renderToStaticMarkup(<LaunchpadHeader showCalendar />);

    expect(html).toContain('aria-label="Main navigation"');
    expect(html).not.toContain("sticky");
  });
});
