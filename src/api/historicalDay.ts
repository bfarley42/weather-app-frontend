import { API_URL } from '../config';

export interface HistoricalDay {
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
  cloud_cover_pct: number | null;
  avg_wind_mph: number | null;
  coverage: { hourly_observation_count: number; completeness: string };
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
