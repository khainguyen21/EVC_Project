/**
 * The print page's choices, remembered on William's computer: the buildings
 * he last ticked and the contact line he typed. They stay in this browser, so
 * no name or email goes into the code or the database.
 *
 * Storage can be unavailable (private windows, blocked site data), and then
 * the page opens with MS and SQ ticked, as in William's document, and no
 * contact line.
 */
const BUILDINGS_KEY = "print-buildings";
const CONTACT_KEY = "print-contact";

export const DEFAULT_PRINT_BUILDINGS = ["MS-112", "SQ-231"];

export function readPrintBuildings(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BUILDINGS_KEY) ?? "null");
    return Array.isArray(saved) && saved.every((b) => typeof b === "string")
      ? saved
      : DEFAULT_PRINT_BUILDINGS;
  } catch {
    return DEFAULT_PRINT_BUILDINGS;
  }
}

export function savePrintBuildings(buildings: string[]) {
  try {
    localStorage.setItem(BUILDINGS_KEY, JSON.stringify(buildings));
  } catch {
    // Not remembered; the page still works.
  }
}

export function readContactLine(): string {
  try {
    return localStorage.getItem(CONTACT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveContactLine(line: string) {
  try {
    localStorage.setItem(CONTACT_KEY, line);
  } catch {
    // Not remembered; the page still works.
  }
}
