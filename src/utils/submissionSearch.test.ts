import { describe, expect, test } from "vitest";
import { parseCourseCodes } from "./courseCodes";
import { searchSubmissions } from "./submissionSearch";

/** A submission as the inbox gets it: codes are read when the tutor sends the form. */
function tutor(name: string, subjectsRaw: string) {
  return { name, subjectsRaw, subjectCodes: parseCourseCodes(subjectsRaw) };
}

const ana = tutor("Ana Lopez", "Ethnic Studies, Psych 1");
const ben = tutor("Ben Tran", "Math 71-73, Calc");
const cam = tutor("Cam Ho", "Criminology, English 1A");
const dee = tutor("Dee Wesley", "Chem 1A / 1B, Chem 30A");
const eli = tutor("Eli Park", "Any math");
const fay = tutor("Fay Kim", "ETH 10, ESL");
const all = [ana, ben, cam, dee, eli, fay];

const names = (query: string) => searchSubmissions(all, query).map((s) => s.name);

describe("searchSubmissions", () => {
  test("an empty or blank search keeps everyone, in order", () => {
    expect(names("")).toEqual(all.map((s) => s.name));
    expect(names("   ")).toEqual(all.map((s) => s.name));
  });

  test("a department name finds every course in it", () => {
    expect(names("ethnic studies")).toEqual(["Ana Lopez", "Fay Kim"]);
    expect(names("Chemistry")).toEqual(["Dee Wesley"]);
  });

  test("a course finds tutors of that course however it is typed", () => {
    expect(names("math 72")).toEqual(["Ben Tran", "Eli Park"]);
    expect(names("MATH072")).toEqual(["Ben Tran", "Eli Park"]);
    expect(names("chem 30a")).toEqual(["Dee Wesley"]);
    expect(names("chem 30-A")).toEqual(["Dee Wesley"]);
  });

  test("a course number doesn't match a longer one that starts the same", () => {
    // "ETH 1" is not "ETH 10", though the letters "eth 1" are inside "ETH 10".
    expect(names("eth 1")).toEqual(["Ana Lopez"]);
  });

  test("a whole-department tutor counts for any course in it", () => {
    expect(names("math 20")).toEqual(["Eli Park"]);
  });

  test("words that aren't a course match what the tutor wrote", () => {
    expect(names("criminology")).toEqual(["Cam Ho"]);
    expect(names("CRIMIN")).toEqual(["Cam Ho"]);
    expect(names("calc")).toEqual(["Ben Tran"]);
  });

  test("a name finds the tutor", () => {
    expect(names("ana")).toEqual(["Ana Lopez"]);
    expect(names("park")).toEqual(["Eli Park"]);
  });

  test("a course search doesn't match letters inside a name", () => {
    // "esl" is in "Wesley", but it is the ESL department.
    expect(names("esl")).toEqual(["Fay Kim"]);
  });

  test("curly apostrophes and extra spaces don't matter", () => {
    const wen = tutor("Wen O’Neil", "Women’s Studies");
    expect(searchSubmissions([wen], "women's studies")).toEqual([wen]);
    expect(searchSubmissions([wen], "o'neil")).toEqual([wen]);
    expect(searchSubmissions([wen], "  women’s   studies ")).toEqual([wen]);
  });

  test("nobody matches a subject no one listed", () => {
    expect(names("astronomy")).toEqual([]);
    expect(names("zzz")).toEqual([]);
  });

  test("fuzz: random searches never throw and keep a subset in order", () => {
    const pieces = ["math", "chem", "eth", " ", "-", "/", "71", "1a", "c1000", "’", "'", "(", "*", "any", "ä", "\t", "studies"];
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let run = 0; run < 2000; run++) {
      let query = "";
      const length = Math.floor(next() * 6);
      for (let i = 0; i < length; i++) query += pieces[Math.floor(next() * pieces.length)];
      const found = searchSubmissions(all, query);
      const positions = found.map((s) => all.indexOf(s));
      expect(positions.every((p) => p >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  test("odd input never throws", () => {
    for (const query of ["/", "-", "()", "[", "*", "\\", "math -", "71", "c1000", "a".repeat(500)]) {
      expect(() => searchSubmissions(all, query)).not.toThrow();
    }
  });
});
