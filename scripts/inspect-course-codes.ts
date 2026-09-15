/**
 * Prints what parseCourseCodes() produces for every subject string currently in
 * production, so the parser can be eyeballed before any search UI exists.
 *
 *   npx ts-node --project prisma/tsconfig.json scripts/inspect-course-codes.ts
 *
 * SUBJECTS is a snapshot taken 2026-09-14. Refresh it with:
 *   curl -s https://evctutoring.com/api/tutors | \
 *     python3 -c "import json,sys; print('\n'.join(sorted({s['name'] for t in json.load(sys.stdin)['tutors'] for s in t['subjects']})))"
 */
import { parseCourseCodes, parseQuery, matchesQuery } from "../src/utils/courseCodes";

const SUBJECTS = [
  "Accounting 1A/B",
  "All Biology",
  "Astronomy",
  "Bio 21",
  "Bio 71, 72",
  "Bus 71, 82, BIS 102",
  "CHEM 015, 30A",
  "CHEM 030A",
  "CHEM 12A, 15, 30A, 1A, 1B",
  "COMSC 028, 075, 076",
  "COMSC 075",
  "COMSC 075, 076, 077",
  "Chem 015, 30A",
  "Chem 15, 30A, 1A, 1B",
  "Chemistry",
  "Computer Science",
  "ESL",
  "English",
  "English C1000",
  "English C1000, C1001",
  "Engr 10, 018",
  "MATH 020, 021, 022, 025, 066/67, 071/72",
  "MATH 020, 021-25, 062, 066/67, 071, 073",
  "MATH 020-023, 025, 062, 066/067, 071/72",
  "MATH 020-025, 066/67, 071/72",
  "MATH 020-025, 066/67, 071/72, 079",
  "MATH 20, 21-25, 62, 66-67, 71-73",
  "MATH STAT C1000",
  "MATH STAT C1000, MATH 062",
  "MSRC/Program Coordinator, MATH STAT C1000",
  "Math 20-25, 62, 66, 67, 71-73",
  "Math 71",
  "Math Instructional Assistant, Lab Lead, All Math, STAT C1000",
  "Math Instructional Assistant, all math up to MATH 072, STAT C1000",
  "Mathematics",
  "Music",
  "Open Computer Lab",
  "Phys 02A/2B, 7A/B/C",
  "Phys 2A, 2B, 7A, 7B",
  "Phys 2A, 7A",
  "Physics",
  "Physics 2A, 7A",
  "Psych C1000, 018, 092",
  "Span 211",
  "Vietnamese",
];

/** Searches a student might realistically type, and what should match. */
const QUERIES = [
  "chem 30a",
  "CHEM 030A",
  "Chem30A",
  "math 71",
  "MATH 020",
  "comsc 75",
  "stat c1000",
  "phys 7b",
  "biology",
  "accounting 1b",
  "underwater basket weaving",
];

function main() {
  console.log("=".repeat(78));
  console.log("SUBJECT STRING  ->  SEARCH TOKENS");
  console.log("=".repeat(78));

  const empty: string[] = [];
  for (const subject of SUBJECTS) {
    const codes = parseCourseCodes(subject);
    if (codes.length === 0) empty.push(subject);
    console.log(`\n  ${subject}`);
    console.log(`    ${codes.length ? codes.join("  ") : "(no tokens — substring fallback only)"}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("DEDUPLICATION CHECK (different spellings should collapse)");
  console.log("=".repeat(78));
  const pairs: [string, string][] = [
    ["CHEM 015, 30A", "Chem 015, 30A"],
    ["MATH 020-025, 066/67, 071/72", "Math 20-25, 66, 67, 71, 72"],
    ["Phys 2A, 7A", "Physics 2A, 7A"],
  ];
  for (const [a, b] of pairs) {
    const ca = parseCourseCodes(a).sort().join(",");
    const cb = parseCourseCodes(b).sort().join(",");
    console.log(`\n  ${a}\n  ${b}\n    ${ca === cb ? "MATCH" : "DIFFER"}`);
    if (ca !== cb) console.log(`      ${ca}\n      ${cb}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("QUERY -> HOW MANY OF THE 45 SUBJECTS MATCH");
  console.log("=".repeat(78));
  for (const query of QUERIES) {
    const parsed = parseQuery(query);
    if (!parsed) {
      console.log(`\n  "${query}"  ->  unparsed (substring fallback handles it)`);
      continue;
    }
    const hits = SUBJECTS.filter((s) => matchesQuery(parseCourseCodes(s), parsed));
    console.log(`\n  "${query}"  ->  ${parsed}  (${hits.length} subject strings)`);
    for (const h of hits.slice(0, 4)) console.log(`       ${h}`);
    if (hits.length > 4) console.log(`       … and ${hits.length - 4} more`);
  }

  console.log("\n" + "=".repeat(78));
  console.log(`${SUBJECTS.length} subject strings, ${empty.length} produced no tokens:`);
  for (const e of empty) console.log(`  ${e}`);
  console.log("=".repeat(78));
}

main();
