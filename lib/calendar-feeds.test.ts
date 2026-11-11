import { describe, expect, it } from "vitest";
import { normalizePublicCalendarUrl, parsePublicCalendar } from "./calendar-feeds";

const feed = { id: "family", name: "Family", color: "#8b5cf6" };

describe("public calendar feeds", () => {
  it("normalizes public webcal links without accepting local network targets", () => {
    expect(normalizePublicCalendarUrl("webcal://p123-caldav.icloud.com/published/2/token")).toBe("https://p123-caldav.icloud.com/published/2/token");
    expect(normalizePublicCalendarUrl("http://calendar.example.com/events.ics")).toBeNull();
    expect(normalizePublicCalendarUrl("https://127.0.0.1/events.ics")).toBeNull();
    expect(normalizePublicCalendarUrl("https://calendar.local/events.ics")).toBeNull();
  });

  it("parses event details and keeps feed color and label", () => {
    const events = parsePublicCalendar(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:event-1\r\nDTSTART:20261110T150000Z\r\nDTEND:20261110T160000Z\r\nSUMMARY:Team planning\r\nLOCATION:Studio A\r\nDESCRIPTION:Bring the current project notes.\r\nURL:https://example.com/event/1\r\nEND:VEVENT\r\nEND:VCALENDAR`, feed, new Date("2026-11-10T00:00:00Z"), new Date("2026-11-11T00:00:00Z"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ calendarName: "Family", color: "#8b5cf6", title: "Team planning", location: "Studio A", description: "Bring the current project notes.", eventUrl: "https://example.com/event/1" });
  });

  it("expands recurring events inside the requested window", () => {
    const events = parsePublicCalendar(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:weekly-1\r\nDTSTART:20261102T150000Z\r\nDTEND:20261102T153000Z\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nSUMMARY:Weekly check-in\r\nEND:VEVENT\r\nEND:VCALENDAR`, feed, new Date("2026-11-09T00:00:00Z"), new Date("2026-11-24T00:00:00Z"));
    expect(events.map((event) => event.startAt)).toEqual(["2026-11-09T15:00:00.000Z", "2026-11-16T15:00:00.000Z", "2026-11-23T15:00:00.000Z"]);
  });
});
