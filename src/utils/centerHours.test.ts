import { describe, expect, it } from "vitest";
import {
  dayHours,
  groupedHours,
  hhmmToMinutes,
  timeMarks,
  toBuildingHours,
  type BuildingHours,
} from "./centerHours";
import { FALL_2026_HOURS } from "./testFixtures";

const at = hhmmToMinutes;

const onlyMsOnMonday: BuildingHours = {
  "MS-112": { Monday: { open: at("09:00"), close: at("12:00") } },
  "LE-237": {},
  "SQ-231": {},
  "VPA-109/111": {},
};

describe("dayHours", () => {
  it("runs from the first building to open until the last one closes", () => {
    expect(dayHours(FALL_2026_HOURS, "Monday")).toEqual({ open: at("08:00"), close: at("18:00") });
    expect(dayHours(FALL_2026_HOURS, "Friday")).toEqual({ open: at("08:00"), close: at("17:00") });
  });

  it("is null on a day every building is closed", () => {
    expect(dayHours(onlyMsOnMonday, "Tuesday")).toBeNull();
  });
});

describe("timeMarks", () => {
  it("offers every quarter hour from the first opening to the last closing", () => {
    const friday = timeMarks(FALL_2026_HOURS, "Friday");
    expect(friday.slice(0, 3)).toEqual(["08:00", "08:15", "08:30"]);
    expect(friday.at(-1)).toBe("17:00");
    expect(friday).toHaveLength(9 * 4 + 1);
  });

  it("offers nothing on a day every building is closed", () => {
    expect(timeMarks(onlyMsOnMonday, "Friday")).toEqual([]);
  });
});

describe("groupedHours", () => {
  it("joins days in a row with the same hours", () => {
    expect(groupedHours(FALL_2026_HOURS["MS-112"])).toEqual([
      { label: "Monday", hours: "8:00 am – 6:00 pm" },
      { label: "Tuesday - Thursday", hours: "8:00 am – 8:00 pm" },
      { label: "Friday", hours: "8:00 am – 5:00 pm" },
    ]);
  });

  it("says when a building is closed", () => {
    expect(groupedHours(onlyMsOnMonday["MS-112"])).toEqual([
      { label: "Monday", hours: "9:00 am – 12:00 pm" },
      { label: "Tuesday - Friday", hours: "Closed" },
    ]);
  });
});

describe("toBuildingHours", () => {
  it("files database rows by building and day, skipping any it doesn't know", () => {
    expect(
      toBuildingHours([
        { building: "MS-112", day: "Monday", open: 540, close: 720 },
        { building: "MS-999", day: "Monday", open: 540, close: 720 },
        { building: "LE-237", day: "Saturday", open: 540, close: 720 },
      ]),
    ).toEqual(onlyMsOnMonday);
  });
});
