/**
 * Schedule — embedded JSON for a single meeting/session block.
 * See docs/architecture/pocketbase-schema.md §12.
 *
 * days: ISO weekday numbers, 1=Monday … 7=Sunday.
 * startTime / endTime: "HH:mm", endTime must be after startTime.
 */
export interface Schedule {
  days: number[];
  startTime: string;
  endTime: string;
}

export const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const DAY_NAMES_ES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates an ISO weekday. 1..7 are valid; anything else is invalid (there is
 * no day 0 and no day 8). Returns false for non-integers too.
 */
export function isValidIsoDay(d: unknown): d is number {
  return typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= 7;
}

/** Validates a wall-clock time in "HH:mm" 24h format. */
export function isValidTime(t: unknown): t is string {
  return typeof t === "string" && TIME_RE.test(t);
}

/**
 * Validates that a whole Schedule object satisfies the domain invariants:
 *  - days is a non-empty array of ISO weekdays in [1..7]
 *  - startTime/endTime are valid "HH:mm"
 *  - endTime is strictly after startTime
 */
export function isValidSchedule(s: unknown): s is Schedule {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (!Array.isArray(o.days) || o.days.length === 0) return false;
  if (!o.days.every((d) => isValidIsoDay(d))) return false;
  if (!isValidTime(o.startTime) || !isValidTime(o.endTime)) return false;
  return o.endTime > o.startTime;
}

/** Human-readable weekday name (Spanish display, presentation not domain). */
export function dayName(d: number): string {
  return DAY_NAMES_ES[d] ?? String(d);
}

/**
 * Normalizes a `schedules` JSON value into an array of Schedule.
 *
 * Semantics per AGENTS.md / schema §12: `[]`, null or invalid values are treated
 * as "not informed" — an empty array, NOT a signal that no sessions exist.
 * Valid objects are kept; invalid entries are filtered out with their original
 * text preserved upstream via `scheduleText`.
 */
export function normalizeSchedules(raw: unknown): Schedule[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidSchedule);
}