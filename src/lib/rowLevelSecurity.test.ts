import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Supabase serves every table in the public schema through its REST API, so
// anyone holding the project's anon key can read and write a table that has
// Row Level Security off. The app connects as postgres, which bypasses RLS, so
// every table gets RLS on and no policies. Prisma doesn't turn it on, so each
// migration that creates a table has to.

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

// Prisma creates this one itself, so no migration's CREATE TABLE names it.
const PRISMA_TABLES = ["_prisma_migrations"];

type Migration = { name: string; sql: string };

function readMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8") }));
}

const TABLE = String.raw`(?:"?public"?\.)?"?(\w+)"?`;
const STATEMENT = new RegExp(
  [
    String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${TABLE}`,
    String.raw`DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?${TABLE}`,
    String.raw`ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${TABLE}\s+(ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY`,
    String.raw`ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?${TABLE}\s+RENAME\s+TO\s+"?(\w+)"?`,
  ].join("|"),
  "gi",
);

/** Whether each table has RLS on once every migration has run, in creation order. */
function rlsByTable(migrations: string[]): Map<string, boolean> {
  const rls = new Map(PRISMA_TABLES.map((table) => [table, false]));
  for (const sql of migrations) {
    const code = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, created, dropped, toggled, toggle, renamed, newName] of code.matchAll(STATEMENT)) {
      if (created && !rls.has(created)) rls.set(created, false);
      if (dropped) rls.delete(dropped);
      if (toggled) rls.set(toggled, toggle.toUpperCase() === "ENABLE");
      if (renamed) {
        rls.set(newName, rls.get(renamed) ?? false);
        rls.delete(renamed);
      }
    }
  }
  return rls;
}

const tablesWithoutRls = (migrations: string[]) =>
  [...rlsByTable(migrations)].filter(([, on]) => !on).map(([table]) => table);

function schemaTables(): string[] {
  const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  return [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(
    ([, model, body]) => body.match(/@@map\("(\w+)"\)/)?.[1] ?? model,
  );
}

describe("row level security in prisma/migrations", () => {
  const migrations = readMigrations();

  it("is on for every table", () => {
    expect(tablesWithoutRls(migrations.map((m) => m.sql))).toEqual([]);
  });

  it("finds every table in schema.prisma", () => {
    const found = [...rlsByTable(migrations.map((m) => m.sql)).keys()];
    expect(found.filter((table) => !PRISMA_TABLES.includes(table)).sort()).toEqual(
      schemaTables().sort(),
    );
  });

  it("would have caught the two tables Supabase flagged in October 2026", () => {
    const before = migrations.filter((m) => m.name < "20261020000000").map((m) => m.sql);
    expect(tablesWithoutRls(before)).toEqual(["_prisma_migrations", "SiteSettings"]);
  });
});

describe("rlsByTable", () => {
  const enablePrisma = `ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;`;
  const missing = (...migrations: string[]) => tablesWithoutRls([enablePrisma, ...migrations]);

  it("flags a table created without RLS", () => {
    expect(missing(`CREATE TABLE "Tutor" ("id" SERIAL);`)).toEqual(["Tutor"]);
  });

  it("counts RLS turned on in a later migration", () => {
    expect(
      missing(`CREATE TABLE "Tutor" ("id" SERIAL);`, `ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;`),
    ).toEqual([]);
  });

  it("reads lowercase, unquoted, schema-qualified and multi-line SQL", () => {
    expect(
      missing(
        `create table if not exists public."Term" (id int);
         create table Holiday (id int);
         alter table only "public"."Term"
           enable row level security;
         ALTER TABLE IF EXISTS Holiday   ENABLE  ROW LEVEL SECURITY;`,
      ),
    ).toEqual([]);
  });

  it("ignores RLS that is only in a comment", () => {
    expect(
      missing(
        `CREATE TABLE "Tutor" ("id" SERIAL);
         -- ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;
         /* ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY; */`,
      ),
    ).toEqual(["Tutor"]);
  });

  it("flags RLS turned off again", () => {
    expect(
      missing(
        `CREATE TABLE "Tutor" ("id" SERIAL); ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE "Tutor" DISABLE ROW LEVEL SECURITY;`,
      ),
    ).toEqual(["Tutor"]);
  });

  it("doesn't mistake a similarly named table", () => {
    expect(
      missing(`CREATE TABLE "SiteSettings" (id int); ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;`),
    ).toEqual(["SiteSettings"]);
  });

  it("follows a renamed table and forgets a dropped one", () => {
    expect(
      missing(
        `CREATE TABLE "Old" (id int); ALTER TABLE "Old" ENABLE ROW LEVEL SECURITY;
         CREATE TABLE "Gone" (id int);`,
        `ALTER TABLE "Old" RENAME TO "New"; DROP TABLE "Gone";`,
      ),
    ).toEqual([]);
    expect(rlsByTable([`CREATE TABLE "Old" (id int); ALTER TABLE "Old" RENAME TO "New";`]).has("New")).toBe(
      true,
    );
  });

  it("doesn't take a renamed column for a renamed table", () => {
    expect(
      missing(
        `CREATE TABLE "Tutor" (a int); ALTER TABLE "Tutor" ENABLE ROW LEVEL SECURITY;`,
        `ALTER TABLE "Tutor" RENAME COLUMN "a" TO "b";`,
      ),
    ).toEqual([]);
  });

  it("flags Prisma's own table until a migration covers it", () => {
    expect(tablesWithoutRls([])).toEqual(["_prisma_migrations"]);
  });
});
