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
  const formOpen = term(1, { availabilityCode: "spring-form" });
  const active = term(2, { isActive: true });
  const newest = term(3);
  const terms = [newest, formOpen, active];

  it("opens the term with the form open, else the active one, else the newest", () => {
    expect(pickDefaultTerm(terms)?.id).toBe(1);
    expect(pickDefaultTerm([newest, active])?.id).toBe(2);
    expect(pickDefaultTerm([newest, term(4)])?.id).toBe(3);
    expect(pickDefaultTerm([])).toBeUndefined();
  });

  it("opens the term William last picked, ahead of the rest", () => {
    expect(pickDefaultTerm(terms, 2)?.id).toBe(2);
    expect(pickDefaultTerm(terms, 3)?.id).toBe(3);
  });

  it("ignores a picked term that was deleted since", () => {
    expect(pickDefaultTerm(terms, 99)?.id).toBe(1);
    expect(pickDefaultTerm(terms, null)?.id).toBe(1);
  });
});
