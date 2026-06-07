// Timestamp formatting for the dashboard.
//
// We format in a FIXED display timezone (not the runtime's local zone) so the server
// (SSR) and the client render the exact same string → no hydration mismatch — while
// still showing the operator's local time. DST is handled automatically by Intl.
//
// TODO: make DISPLAY_TZ a per-user setting; hardcoded to the operator's zone for now.
const DISPLAY_TZ = "Europe/Zagreb";

const _time = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const _date = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TZ,
  day: "2-digit",
  month: "short",
});
const _clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function toDate(input?: string | number): Date | null {
  if (input == null) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `HH:MM` in the display zone. Accepts an ISO string or epoch ms. */
export function fmtTime(input?: string | number): string {
  const d = toDate(input);
  return d ? _time.format(d) : "—";
}

/** `DD Mon · HH:MM` in the display zone — date together with the time. (Composed from
 *  separate date/time parts so the separator doesn't depend on the locale's wording.) */
export function fmtDateTime(input?: string | number): string {
  const d = toDate(input);
  return d ? `${_date.format(d)} · ${_time.format(d)}` : "—";
}

/** `HH:MM:SS` in the display zone (live clock). */
export function fmtClock(input: string | number): string {
  const d = toDate(input);
  return d ? _clock.format(d) : "—";
}
