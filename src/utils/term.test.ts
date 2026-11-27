import { describe, expect, it } from "vitest";
import type { AdminTerm } from "@/types";
import { FALL_2026_HOURS } from "./testFixtures";
import { pickDefaultTerm } from "./term";

function term(id: number, extra: Partial<AdminTerm> = {}): AdminTerm {
  return {
    id,
    name: `Term ${id}`,
    startDate: "2026-08-31",
    endDate: "2026-12-12",
    isActive: false,
    holidays: [],
    buildingHours: FALL_2026_HOURS,
    availabilityCode: null,
    submissionCount: 0,
    ...extra,
  };
}

describe("pickDefaultTerm", () => {
  const today = "2026-11-27";
  const fall = term(1, { isActive: true, startDate: "2026-08-31", endDate: "2026-12-12" });
  const winter = term(2, { startDate: "2026-12-14", endDate: "2027-01-23" });
  const oldSpring = term(3, { startDate: "2026-01-26", endDate: "2026-05-22" });

  it("opens a term William just added, ahead of the running active term", () => {
    expect(pickDefaultTerm([winter, fall, oldSpring], today)?.id).toBe(2);
  });

  it("opens the term with the form open first", () => {
    const fallForm = { ...fall, availabilityCode: "fall-form" };
    expect(pickDefaultTerm([winter, fallForm, oldSpring], today)?.id).toBe(1);
  });

  it("with no newer term, stays on the active one", () => {
    expect(pickDefaultTerm([fall, oldSpring], today)?.id).toBe(1);
  });

  it("once every term has ended: the active one, else the newest", () => {
    expect(pickDefaultTerm([winter, fall, oldSpring], "2027-06-01")?.id).toBe(1);
    expect(pickDefaultTerm([winter, oldSpring], "2027-06-01")?.id).toBe(2);
    expect(pickDefaultTerm([], today)).toBeUndefined();
  });

  it("opens the term William last picked, ahead of the rest", () => {
    expect(pickDefaultTerm([winter, fall, oldSpring], today, 1)?.id).toBe(1);
    expect(pickDefaultTerm([winter, fall, oldSpring], today, 3)?.id).toBe(3);
  });

  it("ignores a picked term that was deleted since", () => {
    expect(pickDefaultTerm([winter, fall], today, 99)?.id).toBe(2);
    expect(pickDefaultTerm([winter, fall], today, null)?.id).toBe(2);
  });
});
