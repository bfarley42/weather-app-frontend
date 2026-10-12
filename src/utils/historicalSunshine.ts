import type { HistoricalDay } from '../api/historicalDay';

export interface SunshineObservation {
  ts_local: string;
  skyc1: string | null;
  wxcodes: string | null;
}

const factors: Record<string, number> = { CLR: 1, SKC: 1, FEW: 0.9, SCT: 0.55, BKN: 0.25, OVC: 0.05 };
// Preserve the existing backend proxy coefficients and weather-code precedence.
export function sunshineAttenuation(code: string | null) {
  const wx = (code || '').toLowerCase();
  for (const [token, factor] of [['ts', 0], ['+ra', 0.05], ['ra', 0.1], ['sn', 0.05], ['fz', 0.05], ['dz', 0.2], ['fg', 0.15], ['br', 0.7], ['hz', 0.75]] as const) {
    if (wx.includes(token)) return factor;
  }
  return 1;
}

function wallClockInstant(timestamp: string, timezone: string) {
  const wall = Date.parse(`${timestamp}Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const localWall = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  };
  let instant = wall;
  for (let attempt = 0; attempt < 4; attempt++) {
    const difference = wall - localWall(instant);
    if (!difference) return instant;
    instant += difference;
  }
  throw new Error('Observation clock hour cannot be resolved in the station timezone');
}

export function historicalSunshine(rows: unknown, day: HistoricalDay) {
  const rise = Date.parse(day.sunrise || '');
  const setting = Date.parse(day.sunset || '');
  if (!Number.isFinite(rise) || !Number.isFinite(setting) || setting <= rise ||
      day.sunrise?.slice(0, 10) !== day.local_date || day.sunset?.slice(0, 10) !== day.local_date) {
    throw new Error('Historical sunrise/sunset are unavailable or do not match the selected date');
  }
  if (!Array.isArray(rows)) throw new Error('Invalid hourly sunshine observations');
  const seen = new Set<number>();
  const buckets = rows.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('ts_local' in row) || typeof row.ts_local !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(row.ts_local) || row.ts_local.slice(0, 10) !== day.local_date) {
      throw new Error('Hourly observations do not match the selected date');
    }
    const record = row as Record<string, unknown>;
    if ((record.skyc1 != null && typeof record.skyc1 !== 'string') || (record.wxcodes != null && typeof record.wxcodes !== 'string')) {
      throw new Error('Invalid sky or weather observation');
    }
    const sky = typeof record.skyc1 === 'string' ? record.skyc1 : null;
    const wx = typeof record.wxcodes === 'string' ? record.wxcodes : null;
    const start = wallClockInstant(`${row.ts_local.slice(0, 13)}:00:00`, day.timezone);
    const daylight = Math.max(0, Math.min(start + 3600000, setting) - Math.max(start, rise)) / 3600000;
    const skyFactor = factors[(sky || '').toUpperCase()] ?? null;
    const factor = skyFactor == null ? null : skyFactor * sunshineAttenuation(wx);
    const duplicate = factor != null && seen.has(start);
    if (factor != null) seen.add(start);
    return {
      timestamp: row.ts_local, sky, wx, daylightHours: duplicate ? 0 : daylight,
      isDaylight: daylight > 0, factor,
      estimatedHours: duplicate || !daylight ? 0 : factor == null ? null : daylight * factor,
    };
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const covered = buckets.reduce((sum, bucket) => sum + (bucket.factor == null ? 0 : bucket.daylightHours), 0);
  const total = buckets.reduce((sum, bucket) => sum + (bucket.estimatedHours ?? 0), 0);
  return {
    buckets, daylightHours: (setting - rise) / 3600000, coveredDaylightHours: covered,
    estimatedHours: covered ? total : null, estimatedPct: covered ? total / covered * 100 : null,
  };
}

export type HistoricalSunshine = ReturnType<typeof historicalSunshine>;
