/**
 * Converts 24-hour time string to 12-hour AM/PM format.
 * Example: "13:00" → "1:00 PM", "09:15" → "9:15 AM", "00:00" → "12:00 AM"
 * If the input is already in 12-hour format or invalid, returns it as-is.
 */
export function formatTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  let hour = parseInt(match[1], 10);
  const minute = match[2];

  if (hour < 0 || hour > 23) return time;

  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${period}`;
}
