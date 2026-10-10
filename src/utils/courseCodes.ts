/**
 * Turns a free-text subject string into canonical course tokens for searching.
 *
 * The stored string stays exactly as the coordinator typed it, because that is
 * what students read on the card ("Phys 02A/2B, 7A/B/C" says more than a list
 * of codes). These tokens are a separate search index derived from it:
 *
 *   "MATH 020-025, 066/67"  ->  MATH-20 … MATH-25, MATH-66, MATH-67
 *   "Chem 015, 30A"         ->  CHEM-15, CHEM-30A
 *   "CHEM 015, 30A"         ->  CHEM-15, CHEM-30A   (same, which is the point)
 *
 * A prefix named with no course number yields a wildcard ("Chemistry" ->
 * "CHEM-*"), so a tutor listed only by department still matches that
 * department. Text that names no department at all ("Open Computer Lab")
 * yields nothing and is reached by the caller's raw-substring fallback.
 */
import { DEPARTMENTS } from "./departments";

/**
 * Every spelling of a department the reader accepts, mapped to its code: the
 * code, the catalog's name, and the other spellings in `also`. A name with
 * "&" also reads with "and", and the other way round.
 */
const PREFIX_ALIASES: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.flatMap(({ code, name, also = [] }) => {
    const names = [name, name.replace(/ & /g, " and "), name.replace(/ and /gi, " & ")];
    return [code, ...also, ...names].map((spelling) => [spelling.toUpperCase(), code]);
  }),
);

/**
 * Words that don't change which courses a subject list names: "any Math",
 * "all levels", "Chem 1A & 1B", "Chem 1A / 1B".
 */
const FILLER_WORDS = new Set(["ANY", "ALL", "AND", "&", "/", "CLASS", "CLASSES", "COURSE", "COURSES", "LEVEL", "LEVELS"]);

/** Longest alias in words, so multi-word names are matched before shorter ones. */
const MAX_ALIAS_WORDS = Math.max(...Object.keys(PREFIX_ALIASES).map((a) => a.split(" ").length));

/** Every course in EVC's catalog, as the reader writes it: "CHEM-1A". */
const CATALOG = new Set(
  DEPARTMENTS.flatMap(({ code, courses }) =>
    courses.split(/\s+/).map((course) => `${code}-${normalizeNumber(course)}`),
  ),
);

/** "CHEM-1" for the catalog's CHEM-1A and 1B: a number that names a lettered series. */
const SERIES = new Set(
  [...CATALOG].map((code) => /^([A-Z]+-\d+)[A-Z]+$/.exec(code)?.[1]).filter(Boolean),
);

/** "75" -> "075", "1A" -> "001A", as the catalog writes them. "C1000" and "8000" stay. */
function padNumber(number: string): string {
  return number.replace(/^\d+/, (digits) => digits.padStart(3, "0"));
}

/** "020" -> "20", "030A" -> "30A", "c1000" -> "C1000". */
function normalizeNumber(raw: string): string | null {
  const token = raw.toUpperCase();

  // Letter-led codes, the catalog's CSU-aligned ones: C1000, C1001. Only C,
  // so a word such as "Calc2" isn't taken for a course number.
  if (/^C\d+$/.test(token)) return token;

  // Digit-led, with one optional letter, as every catalog course has: 020,
  // 30A, 71L. More letters are a typo ("72and"), not a course.
  const match = /^(\d+)([A-Z]?)$/.exec(token);
  if (!match) return null;
  return `${String(parseInt(match[1], 10))}${match[2]}`;
}

/** "020-025": a range of course numbers. */
const RANGE = /^(\d+)\s*-\s*(\d+)$/;

/**
 * Expands one numeric chunk into every course number it covers.
 *
 *   "020-025" -> 20, 21, 22, 23, 24, 25
 *   "066/67"  -> 66, 67
 *   "7A/B/C"  -> 7A, 7B, 7C      (later parts borrow the leading digits)
 */
function expandNumbers(chunk: string): string[] {
  const token = chunk.toUpperCase();

  const range = RANGE.exec(token);
  if (range) {
    const from = parseInt(range[1], 10);
    const to = parseInt(range[2], 10);
    // Guard against a reversed or absurd range rather than looping forever.
    if (to < from || to - from > 60) return [];
    const out: string[] = [];
    for (let n = from; n <= to; n++) out.push(String(n));
    return out;
  }

  if (token.includes("/")) {
    const parts = token.split("/").filter(Boolean);
    if (parts.length === 0) return [];
    const first = normalizeNumber(parts[0]);
    if (!first) return [];
    const digits = /^(\d+)/.exec(first)?.[1] ?? "";
    const out = [first];
    for (const part of parts.slice(1)) {
      // A bare letter borrows the first part's digits: "1A/B" -> 1A, 1B.
      const number = /^[A-Z]$/.test(part) && digits ? `${digits}${part}` : normalizeNumber(part);
      // "71/Calc": the whole word goes to William rather than half of it.
      if (!number) return [];
      out.push(number);
    }
    return out;
  }

  const single = normalizeNumber(token);
  return single ? [single] : [];
}

/** Stands where a comma or semicolon was, so the reader knows where a part ends. */
const BREAK = ",";

/**
 * Splits on commas and whitespace but keeps "020-025" and "066/67" intact.
 * Each comma or semicolon stays behind as a BREAK: "English, ESL" names two
 * subjects, where "MATH STAT C1000" names one.
 * A department joined to its number by a hyphen ("COMSC-075", as many stored
 * subject names are written) or typed right against it ("MATH020") is split
 * in two. Only a known department is, so a range's hyphen and a letter-led
 * number like "C1000" are never touched.
 */
function tokenize(raw: string): string[] {
  return raw
    // Phones type a curly apostrophe: "Women’s Studies".
    .replace(/\u2019/g, "'")
    .split(/([,;])|\s+/)
    // "Math (any)", and William's schedule ends each course list with a colon.
    .map((t) => (t === ";" ? BREAK : (t ?? "").trim().replace(/^[([]+|[)\]:.]+$/g, "")))
    .filter(Boolean)
    .flatMap((t) => {
      const joined = /^([A-Za-z]+)-?(\d\S*)$/.exec(t) ?? /^([A-Za-z]+)-(\S+)$/.exec(t);
      return joined && PREFIX_ALIASES[joined[1].toUpperCase()]
        ? [joined[1], joined[2]]
        : [t];
    });
}

export function parseCourseCodes(raw: string): string[] {
  return read(raw).codes;
}

/**
 * The words in a subject list the reader had to skip, such as "up" in "Math
 * 20 and up": a list read without them may name the wrong courses.
 */
export function unreadWords(raw: string): string[] {
  return read(raw).unread;
}

/**
 * Whether EVC's catalog has a course. A number with no letter counts when the
 * catalog has lettered courses under it: "PHYS-7" names PHYS 7A, 7B and 7C.
 * A whole department ("CHEM-*") always does.
 */
export function inCatalog(code: string): boolean {
  return code.endsWith("-*") || CATALOG.has(code) || SERIES.has(code);
}

/**
 * The courses in a subject list that aren't in EVC's catalog, written the way
 * the catalog writes them: a typo ("COMSC 9999") or an old course number
 * ("Math 63"). A softer warning than unreadWords: the courses still count.
 * A range is named only when none of it is in the catalog, since "MATH
 * 20-25" covers MATH 23 and 24, which don't exist, and that's normal.
 */
export function unknownCourses(raw: string): string[] {
  const unknown = new Set<string>();
  for (const { department, numbers, range } of read(raw).written) {
    const missing = numbers.filter((number) => !inCatalog(`${department}-${number}`));
    if (range) {
      if (missing.length === numbers.length) {
        const last = numbers[numbers.length - 1];
        unknown.add(`${department} ${padNumber(numbers[0])}-${padNumber(last)}`);
      }
    } else {
      for (const number of missing) unknown.add(`${department} ${padNumber(number)}`);
    }
  }
  return [...unknown];
}

/** Course numbers as one word of a subject list gave them: "71", "66/67" or "20-25". */
interface Written {
  department: string;
  numbers: string[];
  range: boolean;
}

function read(raw: string): { codes: string[]; unread: string[]; written: Written[] } {
  const words = tokenize(raw);
  const codes = new Set<string>();
  const unread: string[] = [];
  const written: Written[] = [];
  // Prefixes that were named but have not produced a number yet.
  const barePrefixes = new Set<string>();
  let current: string | null = null;
  // Whether no word of this part (between commas) has been read yet.
  let partStart = true;

  for (let i = 0; i < words.length; i++) {
    if (words[i] === BREAK) {
      partStart = true;
      continue;
    }

    // Try the longest multi-word alias first ("Computer Science" before "Computer").
    let alias: string | undefined;
    let consumed = 0;
    for (let span = MAX_ALIAS_WORDS; span >= 1; span--) {
      const phrase = words.slice(i, i + span).join(" ").toUpperCase();
      if (PREFIX_ALIASES[phrase]) {
        alias = PREFIX_ALIASES[phrase];
        consumed = span;
        break;
      }
    }

    if (alias) {
      // "MATH STAT C1000": a department immediately followed by another, with
      // no comma between, is a qualifier, not the subject. Let the second win.
      const next = words[i + consumed]?.toUpperCase();
      const nextIsPrefix = next !== undefined && PREFIX_ALIASES[next] !== undefined;
      if (!nextIsPrefix) {
        current = alias;
        barePrefixes.add(alias);
      }
      i += consumed - 1;
      partStart = false;
      continue;
    }

    if (FILLER_WORDS.has(words[i].toUpperCase())) continue;

    // A part that starts with a word it can't read ("Mth 20") names some
    // other department, so its numbers don't go to the one before. A C1000
    // starts with a letter too, but is a course number.
    if (partStart && /^[A-Za-z]/.test(words[i]) && expandNumbers(words[i]).length === 0) {
      current = null;
    }
    partStart = false;

    const expanded = current ? expandNumbers(words[i]) : [];
    for (const number of expanded) codes.add(`${current}-${number}`);
    if (expanded.length > 0) {
      barePrefixes.delete(current!);
      written.push({ department: current!, numbers: expanded, range: RANGE.test(words[i]) });
    } else {
      unread.push(words[i]);
    }
  }

  // A department named without any course number still matches that department.
  for (const prefix of barePrefixes) codes.add(`${prefix}-*`);

  return { codes: [...codes], unread, written };
}

/**
 * A course on a chip: "COMSC-075" with the catalog's zeros, and "CHEM (any)"
 * for "CHEM-*", any CHEM course.
 */
export function formatCourseCode(code: string): string {
  if (code.endsWith("-*")) return `${code.slice(0, -2)} (any)`;
  const [department, number] = code.split("-");
  return `${department}-${padNumber(number)}`;
}

/**
 * The reverse of parseCourseCodes: "MATH-20" ... "MATH-25", "MATH-62" become
 * "MATH 020-025, 062", one line per department, with the catalog's zeros.
 */
export function shortenCourseCodes(codes: string[]): string[] {
  const byDepartment = new Map<string, string[]>();
  for (const code of codes) {
    const [department, number] = code.split("-");
    byDepartment.set(department, [...(byDepartment.get(department) ?? []), number]);
  }

  return [...byDepartment.keys()].sort().map((department) => {
    const all = byDepartment.get(department)!;
    // "Any CHEM course" already includes the numbered ones.
    if (all.includes("*")) return formatCourseCode(`${department}-*`);

    const numbers = all
      .map((text) => {
        // Letter-led codes like C1000 sort after every numbered course.
        const digits = /^\d+/.exec(text)?.[0];
        return { text, value: digits ? parseInt(digits, 10) : Infinity, plain: /^\d+$/.test(text) };
      })
      .sort((a, b) => a.value - b.value || a.text.localeCompare(b.text));

    const parts: string[] = [];
    for (let i = 0; i < numbers.length; i++) {
      let end = i;
      while (
        numbers[i].plain &&
        numbers[end + 1]?.plain &&
        numbers[end + 1].value === numbers[end].value + 1
      ) {
        end++;
      }
      const [first, last] = [padNumber(numbers[i].text), padNumber(numbers[end].text)];
      parts.push(end > i ? `${first}-${last}` : first);
      i = end;
    }
    return `${department} ${parts.join(", ")}`;
  });
}

/**
 * Normalizes what a student typed into the same token shape.
 * "chem 30a" -> "CHEM-30A", "math71" -> "MATH-71", "MATH" -> "MATH".
 */
export function parseQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Allow "math71" and "math-71" alongside "math 71". Only split where the
  // leading word is a known department, so letter-led codes such as "C1000"
  // survive intact ("stat c1000" must not become "stat c 1000").
  const spaced = trimmed
    // Rejoin a detached section letter first: "chem 30-a" -> "chem 30a".
    .replace(/(\d)[\s_-]+([A-Za-z])$/, "$1$2")
    .replace(/[-_]+/g, " ")
    .replace(/^([A-Za-z]+)(\d)/, (match, word: string, digit: string) =>
      PREFIX_ALIASES[word.toUpperCase()] ? `${word} ${digit}` : match,
    );
  const codes = parseCourseCodes(spaced);
  if (codes.length === 1) return codes[0];

  // A bare department name: return the prefix so callers can match every course in it.
  const alias = PREFIX_ALIASES[spaced.toUpperCase()];
  return alias ?? null;
}

/**
 * Whether a subject's tokens satisfy a parsed query.
 * A wildcard on either side matches the whole department.
 */
export function matchesQuery(subjectCodes: string[], parsedQuery: string): boolean {
  const [queryPrefix, queryNumber] = parsedQuery.split("-");

  return subjectCodes.some((code) => {
    const [prefix, number] = code.split("-");
    if (prefix !== queryPrefix) return false;
    if (!queryNumber || queryNumber === "*") return true;
    if (number === "*") return true;
    return number === queryNumber;
  });
}
