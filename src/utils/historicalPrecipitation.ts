import type { HourlyPrecipitation } from '../api/historicalDay';

export const isTracePrecipitation = (value: number | null) => value != null && Math.abs(value - 0.0001) < 1e-12;

// Stored hour buckets are reporting-period observations, not verified exact accumulations.
export function historicalPrecipitation(data: HourlyPrecipitation[]) {
  const traces = data.map(hour => isTracePrecipitation(hour.precip_in));
  const values = data.map((hour, index) => traces[index] ? null : hour.precip_in);
  const observed = data.filter(hour => hour.precip_in != null);
  const total = observed.length ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  let sum = 0;
  let unknown = false;
  const cumulative = data.map((hour, index) => {
    // Interpret naive timestamps as wall-clock buckets, independently of browser timezone.
    const stamp = Date.parse(`${hour.ts_local}Z`);
    const previous = index ? Date.parse(`${data[index - 1].ts_local}Z`) : null;
    if (hour.precip_in == null || (index === 0 && !hour.ts_local.includes('T00:00:00')) ||
        (previous != null && stamp - previous !== 3600000)) unknown = true;
    if (!traces[index]) sum += hour.precip_in ?? 0;
    return unknown ? null : Number(sum.toFixed(3));
  });
  return { traces, values, total, cumulative, observedCount: observed.length };
}
