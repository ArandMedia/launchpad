import { afterEach, describe, expect, it } from "vitest";
import { decryptCalendarFeedUrl, decryptHealthPayload, decryptWorkoutPayload, encryptCalendarFeedUrl, encryptHealthPayload, encryptWorkoutPayload, isDomainKey } from "./lifeos-core";

describe("LifeOS modular core", () => {
  afterEach(() => delete process.env.LIFEOS_HEALTH_ENCRYPTION_KEY);

  it("accepts only explicit professional domain boundaries", () => {
    expect(isDomainKey("HEALTH")).toBe(true);
    expect(isDomainKey("SELF")).toBe(true);
    expect(isDomainKey("FITNESS")).toBe(false);
  });

  it("encrypts health measurements with authenticated encryption", () => {
    process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters";
    const encrypted = encryptHealthPayload({ value: 72.4, note: "manual baseline" });
    expect(encrypted.ciphertext).not.toContain("72.4");
    expect(decryptHealthPayload(encrypted)).toEqual({ value: 72.4, note: "manual baseline" });
    expect(() => decryptHealthPayload({ ...encrypted, authTag: Buffer.alloc(16).toString("base64") })).toThrow();
  });

  it("encrypts public calendar subscription URLs with a separate key purpose", () => {
    process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters";
    const encrypted = encryptCalendarFeedUrl("https://calendar.example.com/private-token.ics");
    expect(encrypted.urlCiphertext).not.toContain("private-token");
    expect(decryptCalendarFeedUrl(encrypted)).toBe("https://calendar.example.com/private-token.ics");
  });

  it("encrypts a structured workout log with authenticated encryption", () => {
    process.env.LIFEOS_HEALTH_ENCRYPTION_KEY = "test-health-key-with-at-least-24-characters";
    const workout = { activityKey: "RUNNING" as const, activityLabel: "Running", intensity: "MODERATE" as const, durationMinutes: 30, bodyWeightLbs: 180, met: 9.8, estimatedCalories: 400, caloriesBurned: 400, calorieSource: "ESTIMATED" as const, notes: "Felt steady" };
    const encrypted = encryptWorkoutPayload(workout);
    expect(encrypted.ciphertext).not.toContain("Felt steady");
    expect(decryptWorkoutPayload(encrypted)).toEqual(workout);
    expect(() => decryptWorkoutPayload({ ...encrypted, authTag: Buffer.alloc(16).toString("base64") })).toThrow();
  });
});
