import { API_URL } from '../config';
import { parseHistoricalMoisture } from '../utils/historicalMoisture';

export async function fetchHistoricalMoisture(stationId: string, date: string, signal: AbortSignal) {
  const response = await fetch(`${API_URL}/api/weather/hourly-day?station=${encodeURIComponent(stationId)}&date=${date}`, { signal });
  if (!response.ok) throw new Error(`Failed to fetch hourly observations: ${response.status}`);
  return parseHistoricalMoisture(await response.json(), date);
}
