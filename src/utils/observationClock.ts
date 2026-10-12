// hourly-day returns naive station-local timestamps, not browser-local instants.
export function observationClock(timestamp: string, timezone: string) {
  const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(timestamp);
  const date = new Date(naive ? `${timestamp}Z` : timestamp);
  const zone = naive ? 'UTC' : timezone;
  return {
    hour: Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(date)),
    time: new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date),
    day: Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, day: 'numeric' }).format(date)),
    month: new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short' }).format(date),
  };
}
