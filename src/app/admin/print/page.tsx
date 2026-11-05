"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { Tutor } from "@/types";
import {
  buildPrintSchedule,
  printLocations,
  printTitle,
  type PrintPerson,
  type PrintSection,
} from "@/utils/printSchedule";
import {
  readContactLine,
  readPrintBuildings,
  saveContactLine,
  savePrintBuildings,
} from "@/lib/printSettings";

const cardStyle: React.CSSProperties = {
  padding: "24px",
  backgroundColor: "white",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "10px",
};

// The colors of William's Word document: green for the MSRC, blue for Biology.
const GREEN = "#00b050";
const BLUE = "#5b9bd5";

// Printing shows only the sheet: no sidebar, no controls, no page padding.
const PRINT_CSS = `
  @media print {
    body:has(.print-sheet) aside, .print-controls { display: none !important; }
    body:has(.print-sheet) main { padding: 0 !important; overflow: visible !important; }
    .admin-content:has(.print-sheet) { max-width: none !important; }
    .print-sheet {
      box-shadow: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      max-width: none !important;
      /* Chrome otherwise darkens Biology's light blue to save ink. */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export default function PrintSchedulePage() {
  const [tutors, setTutors] = useState<Tutor[] | null>(null);
  const [termName, setTermName] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [contact, setContact] = useState("");

  useEffect(() => {
    let stale = false;
    Promise.all([
      fetch("/api/tutors").then((res) => (res.ok ? res.json() : Promise.reject(res))),
      // Without a term the title just leaves it out, so a failure here is fine.
      fetch("/api/term")
        .then((res) => (res.ok ? res.json() : { term: null }))
        .catch(() => ({ term: null })),
    ])
      .then(([{ tutors }, { term }]) => {
        if (stale) return;
        setTutors(tutors);
        setTermName(term?.name ?? null);
        setTicked(readPrintBuildings());
        setContact(readContactLine());
      })
      .catch(() => {
        if (!stale) setLoadFailed(true);
      });
    return () => {
      stale = true;
    };
  }, []);

  const locations = useMemo(() => (tutors ? printLocations(tutors) : []), [tutors]);
  // A remembered room that's no longer on the schedule would change the title.
  const chosen = locations.filter((l) => ticked.includes(l));
  const sections = tutors ? buildPrintSchedule(tutors, chosen) : [];
  const title = printTitle(termName, chosen);

  // Chrome names the saved PDF after the page title.
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  function toggle(location: string) {
    const next = chosen.includes(location)
      ? chosen.filter((l) => l !== location)
      : locations.filter((l) => l === location || chosen.includes(l));
    setTicked(next);
    savePrintBuildings(next);
  }

  const canPrint = chosen.length > 0 && sections.length > 0;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-controls">
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.03em",
              marginBottom: "8px",
            }}
          >
            Print Schedule
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Print the schedule for the wall, or pick &ldquo;Save as PDF&rdquo; in the print
            window to send it to the EVC website team. It shows what is on the public schedule
            now.
          </p>
        </div>

        {loadFailed ? (
          <div style={{ ...cardStyle, color: "#991b1b" }}>
            Could not load the schedule. Refresh the page to try again.
          </div>
        ) : tutors === null ? (
          <div style={{ ...cardStyle, color: "#64748b" }}>Loading the schedule…</div>
        ) : (
          <div style={{ ...cardStyle, display: "grid", gap: "24px" }}>
            <fieldset style={{ border: 0 }}>
              <legend style={labelStyle}>Buildings to print</legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
                {locations.map((location) => (
                  <label
                    key={location}
                    style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(location)}
                      onChange={() => toggle(location)}
                      style={{ width: "18px", height: "18px", accentColor: "#10b981" }}
                    />
                    {location}
                  </label>
                ))}
              </div>
            </fieldset>

            <label style={{ display: "block" }}>
              <span style={labelStyle}>Contact line at the end (optional)</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  saveContactLine(e.target.value);
                }}
                placeholder="For example: Please contact the MSRC program coordinator, name and email, for any questions."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  color: "#0f172a",
                }}
              />
              <span style={{ display: "block", color: "#64748b", fontSize: "0.9rem", marginTop: "6px" }}>
                Remembered on this computer.
              </span>
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!canPrint}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  background: canPrint ? "#10b981" : "#cbd5e1",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: canPrint ? "pointer" : "not-allowed",
                }}
              >
                <Printer size={18} />
                Print
              </button>
              <span style={{ color: "#64748b" }}>
                {chosen.length === 0
                  ? "Tick at least one building."
                  : sections.length === 0
                    ? "Nobody has hours in the ticked buildings."
                    : "The preview below is what prints."}
              </span>
            </div>
          </div>
        )}
      </div>

      {tutors && !loadFailed && (
        <article
          className="print-sheet"
          style={{
            maxWidth: "8.5in",
            margin: "32px auto 0",
            padding: "0.6in",
            background: "white",
            color: "#000",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)",
            fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
            lineHeight: 1.3,
          }}
        >
          <h1
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "16pt",
              fontWeight: 700,
              textAlign: "center",
              margin: "0 auto 8pt",
              maxWidth: "6in",
            }}
          >
            {title}
          </h1>
          {sections.map((section) => (
            <PrintedSection key={section.field} section={section} />
          ))}
          {contact.trim() && (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", marginTop: "36pt" }}>
              {contact.trim()}
            </p>
          )}
        </article>
      )}
    </>
  );
}

function PrintedSection({ section }: { section: PrintSection }) {
  const color = section.locations.every((l) => l === "SQ-231") ? BLUE : GREEN;
  const [first, ...rest] = section.people;
  return (
    <section style={{ marginTop: "20pt" }}>
      {/* Together, so a heading never ends a page on its own. */}
      <div style={{ breakInside: "avoid" }}>
        <h2 style={{ color, fontSize: "14pt", fontWeight: 700, marginBottom: "8pt" }}>
          {section.field} ({section.room})
        </h2>
        <PrintedPerson person={first} />
      </div>
      {rest.map((person, i) => (
        <PrintedPerson key={i} person={person} />
      ))}
    </section>
  );
}

function PrintedPerson({ person }: { person: PrintPerson }) {
  const detail = person.detail ? ` (${person.detail})` : "";

  if (person.type === "professor") {
    return (
      <p style={{ fontSize: "12pt", marginBottom: "8pt", breakInside: "avoid" }}>
        <strong>
          {person.name}
          {detail}
        </strong>
        {" – "}
        {person.hours[0]}
      </p>
    );
  }

  if (person.type === "staff") {
    return (
      <p style={{ fontSize: "11pt", marginBottom: "8pt", breakInside: "avoid" }}>
        {person.name}
        <span style={{ fontSize: "9pt" }}>
          {detail}
          {" – "}
          {person.hours[0]}
        </span>
      </p>
    );
  }

  return (
    <div style={{ marginBottom: "8pt", breakInside: "avoid" }}>
      <p style={{ fontSize: "10pt", marginBottom: "4pt" }}>
        {person.name}
        {person.detail ? `, ${person.detail}` : ""}:
      </p>
      <ul style={{ fontSize: "11pt", paddingLeft: "32pt", listStyle: "disc" }}>
        {person.hours.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
