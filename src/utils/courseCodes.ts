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

/** Department spellings seen in the data, mapped to one canonical prefix. */
const PREFIX_ALIASES: Record<string, string> = {
  ACCT: "ACCT",
  ACCOUNTING: "ACCT",
  ART: "ART",
  ASTR: "ASTR",
  ASTRO: "ASTR",
  ASTRONOMY: "ASTR",
  BIO: "BIOL",
  BIOL: "BIOL",
  BIOLOGY: "BIOL",
  BIS: "BIS",
  BUS: "BUS",
  BUSINESS: "BUS",
  CHEM: "CHEM",
  CHEMISTRY: "CHEM",
  COMSC: "COMSC",
  CS: "COMSC",
  "COMPUTER SCIENCE": "COMSC",
  ECON: "ECON",
  ECONOMICS: "ECON",
  ENGL: "ENGL",
  ENGLISH: "ENGL",
  ENGR: "ENGR",
  ENGINEERING: "ENGR",
  ESL: "ESL",
  ETHN: "ETHN",
  "ETHNIC STUDIES": "ETHN",
  HIST: "HIST",
  HISTORY: "HIST",
  MATH: "MATH",
  MATHEMATICS: "MATH",
  MUS: "MUS",
  MUSIC: "MUS",
  PHYS: "PHYS",
  PHYSICS: "PHYS",
  PSYC: "PSYC",
  PSYCH: "PSYC",
  PSYCHOLOGY: "PSYC",
  SOCI: "SOCI",
  SOC: "SOCI",
  SOCIOLOGY: "SOCI",
  SPAN: "SPAN",
  SPANISH: "SPAN",
  STAT: "STAT",
  STATISTICS: "STAT",
  VIET: "VIET",
  VIETNAMESE: "VIET",
};

/** Longest alias key in words, so multi-word names are matched before single. */
const MAX_ALIAS_WORDS = 2;

/** "020" -> "20", "030A" -> "30A", "c1000" -> "C1000". */
function normalizeNumber(raw: string): string | null {
  const token = raw.toUpperCase();

  // Letter-led codes (the CSU-aligned ones): C1000, C1001.
  if (/^[A-Z]+\d+$/.test(token)) return token;

  // Digit-led, with an optional letter suffix: 020, 30A, 12A.
  const match = /^(\d+)([A-Z]*)$/.exec(token);
  if (!match) return null;
  return `${String(parseInt(match[1], 10))}${match[2]}`;
}

/**
 * Expands one numeric chunk into every course number it covers.
 *
 *   "020-025" -> 20, 21, 22, 23, 24, 25
 *   "066/67"  -> 66, 67
 *   "7A/B/C"  -> 7A, 7B, 7C      (later parts borrow the leading digits)
 */
function expandNumbers(chunk: string): string[] {
  const token = chunk.toUpperCase();

  const range = /^(\d+)\s*-\s*(\d+)$/.exec(token);
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
    const first = normalizeNumber(parts[0]);
    if (!first) return [];
    const digits = /^(\d+)/.exec(first)?.[1] ?? "";
    const out = [first];
    for (const part of parts.slice(1)) {
      // A bare letter borrows the first part's digits: "1A/B" -> 1A, 1B.
      out.push(/^[A-Z]+$/.test(part) ? `${digits}${part}` : normalizeNumber(part) ?? "");
    }
    return out.filter(Boolean);
  }

  const single = normalizeNumber(token);
  return single ? [single] : [];
}

/** Splits on commas and whitespace but keeps "020-025" and "066/67" intact. */
function tokenize(raw: string): string[] {
  return raw
    .split(/[,;]|\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseCourseCodes(raw: string): string[] {
  const words = tokenize(raw);
  const codes = new Set<string>();
  // Prefixes that were named but have not produced a number yet.
  const barePrefixes = new Set<string>();
  let current: string | null = null;

  for (let i = 0; i < words.length; i++) {
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
      // "MATH STAT C1000": a department immediately followed by another is a
      // qualifier, not the subject. Let the second one win.
      const next = words[i + consumed]?.toUpperCase();
      const nextIsPrefix = next !== undefined && PREFIX_ALIASES[next] !== undefined;
      if (!nextIsPrefix) {
        current = alias;
        barePrefixes.add(alias);
      }
      i += consumed - 1;
      continue;
    }

    if (!current) continue;

    const expanded = expandNumbers(words[i]);
    for (const number of expanded) codes.add(`${current}-${number}`);
    if (expanded.length > 0) barePrefixes.delete(current);
  }

  // A department named without any course number still matches that department.
  for (const prefix of barePrefixes) codes.add(`${prefix}-*`);

  return [...codes];
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
