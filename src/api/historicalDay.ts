import { API_URL } from '../config';

export interface HistoricalDay {
  dominant_condition?: string | null;
  station_id: string;
  station_name: string | null;
  timezone: string;
  local_date: string;
  has_observations: boolean;
  high_f: number | null;
  low_f: number | null;
  precip_in: number | null;
  precip_is_trace: boolean | null;
  precip_has_trace: boolean | null;
  estimated_sunshine_hours: number | null;
  estimated_sunshine_pct: number | null;
  sunrise?: string | null;
  sunset?: string | null;
  cloud_cover_pct: number | null;
  avg_wind_mph: number | null;
  sources?: { prcp_in: string | null };
  coverage: { hourly_observation_count: number; completeness: string; calendar_day_hours?: number; daylight_hours_with_valid_sky?: number };
}

export interface HourlyPrecipitation {
  ts_local: string;
  precip_in: number | null;
}

export async function fetchHistoricalPrecipitation(stationId: string, date: string, signal: AbortSignal): Promise<HourlyPrecipitation[]> {
  const response = await fetch(`${API_URL}/api/weather/hourly-day?station=${encodeURIComponent(stationId)}&date=${date}`, { signal });
  if (!response.ok) throw new Error(`Failed to fetch precip data: ${response.status}`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid hourly precipitation response');
  return rows.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('ts_local' in row) || typeof row.ts_local !== 'string' || row.ts_local.slice(0, 10) !== date) {
      throw new Error('Hourly observations do not match the selected date');
    }
    const amount = 'precip_in' in row ? row.precip_in : null;
    if (amount != null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)) {
      throw new Error('Invalid hourly precipitation measurement');
    }
    return { ts_local: row.ts_local, precip_in: typeof amount === 'number' ? amount : null };
  });
}

// Cache in-flight requests as well as completed days; failed requests can be retried.
const days = new Map<string, Promise<HistoricalDay>>();

export function fetchHistoricalDay(stationId: string, date: string): Promise<HistoricalDay> {
  const key = `${stationId}:${date}`;
  const cached = days.get(key);
  if (cached) return cached;
  const request = fetch(`${API_URL}/api/stations/${encodeURIComponent(stationId)}/day-summary?date=${date}`)
    .then(async response => {
      if (!response.ok) throw new Error(`Unable to load historical observations (${response.status})`);
      const day: HistoricalDay = await response.json();
      if (day.station_id !== stationId || day.local_date !== date) {
        throw new Error('The response does not match the selected station and date');
      }
      return day;
    })
    .catch(error => {
      days.delete(key);
      throw error;
    });
  days.set(key, request);
  return request;
}
