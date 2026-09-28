import type { Submission } from "@/types";
import {
  CENTER_HOURS,
  WEEKDAYS,
  formatHour,
  hhmmToMinutes,
} from "@/utils/centerHours";

// The grid spans the earliest opening to the latest closing across the week.
const DAY_START = Math.min(...WEEKDAYS.map((d) => hhmmToMinutes(CENTER_HOURS[d].open)));
const DAY_END = Math.max(...WEEKDAYS.map((d) => hhmmToMinutes(CENTER_HOURS[d].close)));
const PX_PER_MINUTE = 0.6;
const HEIGHT = (DAY_END - DAY_START) * PX_PER_MINUTE;

const top = (hhmm: string) => (hhmmToMinutes(hhmm) - DAY_START) * PX_PER_MINUTE;

/** One tutor's week at a glance: green where they are free. */
export default function WeeklyGrid({
  availability,
}: {
  availability: Submission["availability"];
}) {
  const hours: string[] = [];
  for (let t = DAY_START; t <= DAY_END; t += 60) {
    hours.push(`${String(t / 60).padStart(2, "0")}:00`);
  }

  return (
    <div className="week-grid">
      <div />
      {WEEKDAYS.map((day) => (
        <div key={day} className="week-grid__head">
          {day.slice(0, 3)}
        </div>
      ))}

      <div className="week-grid__hours" style={{ height: HEIGHT }}>
        {hours.map((h) => (
          <span key={h} className="week-grid__hour" style={{ top: top(h) }}>
            {formatHour(h).replace(":00", "")}
          </span>
        ))}
      </div>

      {WEEKDAYS.map((day) => (
        <div key={day} className="week-grid__day" style={{ height: HEIGHT }}>
          {/* Hatch the hours the center is closed that day. */}
          <div
            className="week-grid__closed"
            style={{ top: top(CENTER_HOURS[day].close) }}
          />
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
      ))}
    </div>
  );
}
