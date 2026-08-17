/** Matches format-due-date.util.ts's notification-copy style: "20 August, 3:00 pm". */
export function formatEventTime(date: Date, isAllDay: boolean): string {
  if (isAllDay) return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return date.toLocaleString("en-GB", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
}
