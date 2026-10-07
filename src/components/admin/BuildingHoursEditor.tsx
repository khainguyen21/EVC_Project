"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Term } from "@/types";
import { useToast } from "@/components/admin/ToastProvider";
import { BUILDING_INFO, clock } from "@/components/planner/format";
import { adminFetch, errorMessage } from "@/lib/adminFetch";
import {
  BUILDINGS,
  SLOT_MINUTES,
  WEEKDAYS,
  type Building,
  type BuildingHours,
  type Weekday,
} from "@/utils/centerHours";

// The times William can pick, 6 am to 10 pm. Wide enough for any building.
const FIRST = 6 * 60;
const LAST = 22 * 60;
const TIMES: number[] = [];
for (let t = FIRST; t <= LAST; t += SLOT_MINUTES) TIMES.push(t);

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "0.8rem",
  background: "white",
};

const buttonStyle = (color: string, border: string, background = "white"): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  background,
  color,
  border: `1px solid ${border}`,
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
});

/**
 * A term's hours, building by building. The form, the planner and the rules
 * page all read them, so a change here shows up everywhere.
 */
export default function BuildingHoursEditor({
  term,
  onSaved,
}: {
  term: Term;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<BuildingHours | null>(null);
  const [saving, setSaving] = useState(false);
  const shown = draft ?? term.buildingHours;

  const setDay = (building: Building, day: Weekday, open: number | null, close?: number) =>
    setDraft((d) => {
      const current = d ?? term.buildingHours;
      const week = { ...current[building] };
      if (open === null) delete week[day];
      else {
        const before = week[day]?.close;
        // Keep the closing time if it still comes after the new opening.
        week[day] = {
          open,
          close: close ?? (before !== undefined && before > open ? before : Math.min(open + 60, LAST)),
        };
      }
      return { ...current, [building]: week };
    });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await adminFetch(`/api/terms/${term.id}/building-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: draft }),
      });
      showToast(`${term.name} building hours saved.`, "success");
      setDraft(null);
      onSaved();
    } catch (error) {
      showToast(errorMessage(error, "Couldn't save the building hours."), "error");
    } finally {
      setSaving(false);
    }
  };

  const noneSet = BUILDINGS.every((b) => Object.keys(term.buildingHours[b]).length === 0);

  return (
    <div>
      {noneSet && !draft && (
        <p style={{ color: "#b45309", fontSize: "0.9rem", margin: "0 0 12px 0" }}>
          No hours yet. Every building shows as closed until you set them.
        </p>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th />
              {WEEKDAYS.map((d) => (
                <th
                  key={d}
                  style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontWeight: 600 }}
                >
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUILDINGS.map((b) => (
              <tr key={b} style={{ borderTop: "1px solid #f1f5f9" }}>
                <th style={{ padding: "8px", textAlign: "left", whiteSpace: "nowrap" }}>
                  <div style={{ color: BUILDING_INFO[b].color, fontWeight: 800 }}>{b}</div>
                  <div style={{ color: "#94a3b8", fontWeight: 500, fontSize: "0.75rem" }}>
                    {BUILDING_INFO[b].name}
                  </div>
                </th>
                {WEEKDAYS.map((d) => {
                  const today = shown[b][d];
                  return (
                    <td key={d} style={{ padding: "6px 8px", minWidth: draft ? 110 : undefined }}>
                      {!draft ? (
                        today ? (
                          <span style={{ whiteSpace: "nowrap", color: "#0f172a" }}>
                            {clock(today.open)} – {clock(today.close)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Closed</span>
                        )
                      ) : (
                        <div style={{ display: "grid", gap: 4 }}>
                          <select
                            aria-label={`${b} ${d} opens`}
                            value={today?.open ?? ""}
                            onChange={(e) =>
                              setDay(b, d, e.target.value === "" ? null : Number(e.target.value))
                            }
                            style={selectStyle}
                          >
                            <option value="">Closed</option>
                            {TIMES.slice(0, -1).map((t) => (
                              <option key={t} value={t}>
                                {clock(t)}
                              </option>
                            ))}
                          </select>
                          {today && (
                            <select
                              aria-label={`${b} ${d} closes`}
                              value={today.close}
                              onChange={(e) => setDay(b, d, today.open, Number(e.target.value))}
                              style={selectStyle}
                            >
                              {TIMES.filter((t) => t > today.open).map((t) => (
                                <option key={t} value={t}>
                                  to {clock(t)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        {draft ? (
          <>
            <button
              onClick={save}
              disabled={saving}
              style={buttonStyle("white", "#0f172a", "#0f172a")}
            >
              {saving ? "Saving…" : "Save Hours"}
            </button>
            <button
              onClick={() => setDraft(null)}
              disabled={saving}
              style={buttonStyle("#475569", "#cbd5e1")}
            >
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setDraft(term.buildingHours)} style={buttonStyle("#475569", "#cbd5e1")}>
            <Pencil size={14} /> Edit Hours
          </button>
        )}
      </div>
    </div>
  );
}
