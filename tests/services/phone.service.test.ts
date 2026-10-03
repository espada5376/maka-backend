import { describe, expect, it } from "vitest";
import { PhoneService } from "../../src/services/phone.service.js";

describe("PhoneService", () => {
  const phoneService = new PhoneService();

  it("normalizes a valid international phone number to E.164", () => {
    expect(phoneService.normalize("+228 90 12 34 56")).toBe(
      "+22890123456",
    );
  });

  it("accepts an already normalized E.164 number", () => {
    expect(phoneService.normalize("+22890123456")).toBe(
      "+22890123456",
    );
  });

  it("normalizes a phone number with surrounding spaces", () => {
    expect(phoneService.normalize("  +22890123456  ")).toBe(
      "+22890123456",
    );
  });

  it("rejects an invalid phone number", () => {
    expect(() => phoneService.normalize("+228123")).toThrow();
  });

  it("rejects an empty phone number", () => {
    expect(() => phoneService.normalize("")).toThrow();
  });

  it("rejects a non-string phone number", () => {
    expect(() =>
      phoneService.normalize(22890123456 as unknown as string),
    ).toThrow();
  });
});
