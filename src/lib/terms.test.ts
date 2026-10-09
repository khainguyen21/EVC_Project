import { describe, expect, it } from "vitest";
import { buildingHoursSchema } from "./terms";
import { FALL_2026_HOURS } from "@/utils/testFixtures";

function firstError(value: unknown) {
  const result = buildingHoursSchema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message;
}

const withMonday = (open: number, close: number) => ({
  ...FALL_2026_HOURS,
  "MS-112": { ...FALL_2026_HOURS["MS-112"], Monday: { open, close } },
});

describe("buildingHoursSchema", () => {
  it("accepts a term's hours, closed days included", () => {
    expect(buildingHoursSchema.safeParse(FALL_2026_HOURS).success).toBe(true);
    expect(buildingHoursSchema.safeParse({ ...FALL_2026_HOURS, "VPA-109/111": {} }).success).toBe(
      true,
    );
  });

  it("needs closing after opening", () => {
    expect(firstError(withMonday(600, 600))).toBe("MS-112 on Monday: closing must be after opening");
  });

  it("needs quarter hours within the day", () => {
    expect(firstError(withMonday(490, 600))).toBe("Hours must be quarter hours within the day");
    expect(firstError(withMonday(600, 1500))).toBe("Hours must be quarter hours within the day");
  });

  it("refuses a building the site doesn't know", () => {
    expect(buildingHoursSchema.safeParse({ ...FALL_2026_HOURS, "XX-1": {} }).success).toBe(false);
  });
});
