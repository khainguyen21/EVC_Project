import { describe, expect, it } from "vitest";
import { DEPARTMENTS } from "./departments";

describe("DEPARTMENTS", () => {
  it("lists each department code once", () => {
    const codes = DEPARTMENTS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("never gives one spelling to two departments", () => {
    const owner = new Map<string, string>();
    for (const { code, name, also = [] } of DEPARTMENTS) {
      for (const spelling of [code, name, ...also].map((s) => s.toUpperCase())) {
        expect(owner.get(spelling) ?? code, spelling).toBe(code);
        owner.set(spelling, code);
      }
    }
  });

  it("writes department codes in capitals, with nothing but letters", () => {
    for (const { code, also = [] } of DEPARTMENTS) {
      for (const spelling of [code, ...also]) expect(spelling, spelling).toMatch(/^[A-Z]+$/);
    }
  });

  it("writes every course number the way the catalog does: 001A, 022, C1000", () => {
    for (const { code, courses } of DEPARTMENTS) {
      for (const course of courses.split(/\s+/)) {
        expect(course, `${code} ${course}`).toMatch(/^(\d{3}[A-Z]?|C?\d{4})$/);
      }
    }
  });

  it("lists each course once in its department", () => {
    for (const { code, courses } of DEPARTMENTS) {
      const list = courses.split(/\s+/);
      expect(new Set(list).size, code).toBe(list.length);
    }
  });

  it("holds every course in Khai's catalog list but II's two", () => {
    // 617 courses in the October 2026 list. Change this when the list is updated.
    const total = DEPARTMENTS.reduce((sum, d) => sum + d.courses.split(/\s+/).length, 0);
    expect(total).toBe(615);
    expect(DEPARTMENTS).toHaveLength(62);
  });

  it("leaves out II, the tutoring course's department", () => {
    for (const { code, also = [] } of DEPARTMENTS) expect([code, ...also]).not.toContain("II");
  });
});
