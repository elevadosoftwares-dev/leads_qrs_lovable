export const DAILY_ACCESS_THRESHOLD = 5;

export function singaporeDay(at: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

export function dailyQuotationCount(
  logs: { quotationId: string; user: string; userId?: string; at: string }[],
  user: { id: string; name: string },
  at: string,
) {
  const day = singaporeDay(at);
  return new Set(
    logs
      .filter(
        (l) =>
          (l.userId ? l.userId === user.id : l.user === user.name) && singaporeDay(l.at) === day,
      )
      .map((l) => l.quotationId),
  ).size;
}

export function crossesDailyThreshold(before: number, after: number) {
  return before < DAILY_ACCESS_THRESHOLD && after >= DAILY_ACCESS_THRESHOLD;
}

export function matchesClientName(clientName: string, search: string) {
  return clientName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

export function manualQuotationNumber(value: string) {
  return value.trim();
}
