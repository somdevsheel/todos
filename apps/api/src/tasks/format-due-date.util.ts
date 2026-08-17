/** Matches the spec's notification-copy example: "Due: 20 August". */
export function formatDueDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
