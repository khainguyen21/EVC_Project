import type { Submission } from "@/types";
import {
  WEEKDAYS,
  dayHours,
  formatHour,
  hhmmToMinutes,
  type BuildingHours,
} from "@/utils/centerHours";

const PX_PER_MINUTE = 0.6;

/** One tutor's week at a glance: green where they are free. */
export default function WeeklyGrid({
  availability,
  hours,
}: {
  availability: Submission["availability"];
  /** The term's building hours, which set the grid's span and closed times. */
  hours: BuildingHours;
}) {
  // The grid spans the earliest opening to the latest closing across the week.
  const spans = WEEKDAYS.map((d) => dayHours(hours, d)).filter((s) => s !== null);
  const dayStart = spans.length > 0 ? Math.min(...spans.map((s) => s.open)) : 9 * 60;
  const dayEnd = spans.length > 0 ? Math.max(...spans.map((s) => s.close)) : 17 * 60;
  const height = (dayEnd - dayStart) * PX_PER_MINUTE;
  const y = (minutes: number) => (minutes - dayStart) * PX_PER_MINUTE;
  const top = (hhmm: string) => y(hhmmToMinutes(hhmm));

  const marks: string[] = [];
  for (let t = Math.ceil(dayStart / 60) * 60; t <= dayEnd; t += 60) {
    marks.push(`${String(t / 60).padStart(2, "0")}:00`);
  }

  return (
    <div className="week-grid">
      <div />
      {WEEKDAYS.map((day) => (
        <div key={day} className="week-grid__head">
          {day.slice(0, 3)}
        </div>
      ))}

      <div className="week-grid__hours" style={{ height }}>
        {marks.map((h) => (
          <span key={h} className="week-grid__hour" style={{ top: top(h) }}>
            {formatHour(h).replace(":00", "")}
          </span>
        ))}
      </div>

      {WEEKDAYS.map((day) => {
        const span = dayHours(hours, day);
        return (
          <div key={day} className="week-grid__day" style={{ height }}>
            {/* Hatch the hours every building is closed that day. */}
            {span ? (
              <>
                {span.open > dayStart && (
                  <div className="week-grid__closed" style={{ top: 0, bottom: "auto", height: y(span.open) }} />
                )}
                <div className="week-grid__closed" style={{ top: y(span.close) }} />
              </>
            ) : (
              <div className="week-grid__closed" style={{ top: 0 }} />
            )}
            {availability
              .filter((r) => r.day === day)
              .map((r) => (
                <div
                  key={`${r.start}-${r.end}`}
                  className="week-grid__block"
                  style={{ top: top(r.start), height: top(r.end) - top(r.start) }}
                  title={`${day} ${formatHour(r.start)}–${formatHour(r.end)}`}
                >
                  {formatHour(r.start)}–{formatHour(r.end)}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
