// src/components/WeatherSummary.tsx
import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './WeatherSummary.css';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in: number | null;
}

interface ClimateNormal {
  mmdd: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in?: number | null;
}

interface WeatherSummaryProps {
  data: DailyWeather[];
  stationId: string;
  stationName: string;
  startDate: string;
  endDate: string;
  darkMode?: boolean;
}

export default function WeatherSummary({ data, stationId, stationName, startDate, endDate, darkMode = false }: WeatherSummaryProps) {
  const [normals, setNormals] = useState<ClimateNormal[]>([]);

  // Fetch normals
  useEffect(() => {
    const fetchNormals = async () => {
      try {
        const response = await fetch(`${API_URL}/api/weather/normals?station=${stationId}`);
        if (response.ok) {
          const data = await response.json();
          setNormals(data);
        }
      } catch (error) {
        console.error('Error fetching normals:', error);
      }
    };

    if (stationId) {
      fetchNormals();
    }
  }, [stationId]);

  if (!data || data.length === 0) {
    return null;
  }

  // Build normals map
  const normalsMap = new Map(normals.map(n => [n.mmdd, n]));

  // Get dates from data
  const dates = data.map(d => new Date(d.obs_date + 'T12:00:00'));

  // Calculate normal values for the period
  const normalHighs: number[] = [];
  const normalLows: number[] = [];
  let normalPrecipTotal = 0;
  let normalSnowTotal = 0;

    const shortenStationName = (name: string): string => {
    if (!name) return '';

    // Only shorten if the length is > 45
    if (name.length > 40) {
      return name
        .replace(/INTERNATIONAL/g, 'INTL')
        .replace(/AIRPORT/g, 'AP')
        .replace(/CENTER/g, 'CTR');
    }

    // Otherwise return original name
    return name;
  };

  dates.forEach(date => {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const normal = normalsMap.get(mmdd);
    if (normal?.tmax_f !== null && normal?.tmax_f !== undefined) normalHighs.push(normal.tmax_f);
    if (normal?.tmin_f !== null && normal?.tmin_f !== undefined) normalLows.push(normal.tmin_f);
    normalPrecipTotal += normal?.prcp_in || 0;
    normalSnowTotal += normal?.snow_in || 0;
  });

  const normalAvgHigh = normalHighs.length > 0 
    ? normalHighs.reduce((a, b) => a + b, 0) / normalHighs.length 
    : null;
  
  const normalAvgLow = normalLows.length > 0
    ? normalLows.reduce((a, b) => a + b, 0) / normalLows.length
    : null;

  const normalAvgAvg = (normalAvgHigh !== null && normalAvgLow !== null)
    ? (normalAvgHigh + normalAvgLow) / 2
    : null;

  // Calculate observed statistics
  const validHighs = data.filter(d => d.tmax_f !== null).map(d => d.tmax_f!);
  const validLows = data.filter(d => d.tmin_f !== null).map(d => d.tmin_f!);
  const validPrecip = data.filter(d => d.prcp_in !== null).map(d => d.prcp_in!);
  const validSnow = data.filter(d => d.snow_in !== null && d.snow_in > 0).map(d => d.snow_in!);

  const avgHigh = validHighs.length > 0 
    ? validHighs.reduce((a, b) => a + b, 0) / validHighs.length 
    : null;
  
  const avgLow = validLows.length > 0
    ? validLows.reduce((a, b) => a + b, 0) / validLows.length
    : null;

  const avgAvg = (avgHigh !== null && avgLow !== null)
    ? (avgHigh + avgLow) / 2
    : null;

  const maxHigh = validHighs.length > 0 ? Math.max(...validHighs) : null;
  const minLow = validLows.length > 0 ? Math.min(...validLows) : null;

  const totalPrecip = validPrecip.reduce((a, b) => a + b, 0);
  const totalSnow = validSnow.reduce((a, b) => a + b, 0);

  // Find wettest day
  const wettestDay = data.reduce((max, d) => 
    (d.prcp_in || 0) > (max.prcp_in || 0) ? d : max
  , data[0]);

  // Find hottest and coldest days
  const hottestDay = data.reduce((max, d) =>
    (d.tmax_f || -999) > (max.tmax_f || -999) ? d : max
  , data[0]);

  const coldestDay = data.reduce((min, d) =>
    (d.tmin_f || 999) < (min.tmin_f || 999) ? d : min
  , data[0]);

  // Count rainy/snowy days
  const rainyDays = data.filter(d => (d.prcp_in || 0) > 0.01).length;
  const snowyDays = data.filter(d => (d.snow_in || 0) > 0.1).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // Variance formatting
  const formatTempVariance = (observed: number | null, normal: number | null) => {
    if (observed === null || normal === null) return null;
    const diff = observed - normal;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}°`;
  };

  const formatPrecipVariance = (observed: number, normal: number) => {
    if (normal === 0) return null;
    const diff = observed - normal;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}"`;
  };

  // Variance component
  const Variance = ({ value }: { value: string | null }) => {
    if (!value) return null;
    const isPositive = value.startsWith('+');
    return (
      <div className={`stat-variance ${isPositive ? 'above' : 'below'}`}>
        <span className="variance-arrow">{isPositive ? '▲' : '▼'}</span>
        {value} vs normal
      </div>
    );
  };

  return (
    <div className={`weather-summary ${darkMode ? 'dark-mode' : ''}`}>
      <div className="summary-header">
        <h3>{shortenStationName(stationName)}</h3>
        <p className="date-range">{formatDateRange(startDate, endDate)}</p>
      </div>

      <div className="summary-grid">

        <div className="stat-card highlight">
          <div className="stat-label">Avg Temp</div>
          <div className="stat-value temp-avg">
            {avgAvg !== null ? `${avgAvg.toFixed(1)}°F` : 'N/A'}
          </div>
          <Variance value={formatTempVariance(avgAvg, normalAvgAvg)} />
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Total Precip</div>
          <div className="stat-value precip">
            {totalPrecip.toFixed(2)}"
          </div>
          <Variance value={formatPrecipVariance(totalPrecip, normalPrecipTotal)} />
          <div className="stat-detail">
            {rainyDays} rainy days
          </div>
        </div>


        <div className="stat-card highlight">
          <div className="stat-label">Avg High</div>
          <div className="stat-value temp-high">
            {avgHigh !== null ? `${avgHigh.toFixed()}°F` : 'N/A'}
          </div>
          <Variance value={formatTempVariance(avgHigh, normalAvgHigh)} />
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Avg Low</div>
          <div className="stat-value temp-low">
            {avgLow !== null ? `${avgLow.toFixed(1)}°F` : 'N/A'}
          </div>
          <Variance value={formatTempVariance(avgLow, normalAvgLow)} />
        </div>



        <div className="stat-card highlight">
          <div className="stat-label">
            {/* <svg className="stat-icon hot" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg> */}
            🌡️ Hottest Day
          </div>
          <div className="stat-value temp-high">
            {maxHigh !== null ? `${maxHigh.toFixed(0)}°F` : 'N/A'}
          </div>
          <div className="stat-detail">
            {formatDate(hottestDay.obs_date)}
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">
            <svg className="stat-icon cold" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="m20 16-4-4 4-4"/>
              <path d="m4 8 4 4-4 4"/>
              <path d="m16 4-4 4-4-4"/>
              <path d="m8 20 4-4 4 4"/>
            </svg>
    {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="m20 16-4-4 4-4" />
      <path d="m4 8 4 4-4 4" />
      <path d="m16 4-4 4-4-4" />
      <path d="m8 20 4-4 4 4" /> */}
    {/* </svg>  */} Coldest Day
          </div>
          <div className="stat-value temp-low">
            {minLow !== null ? `${minLow.toFixed(0)}°F` : 'N/A'}
          </div>
          <div className="stat-detail">
            {formatDate(coldestDay.obs_date)}
          </div>
        </div>


        <div className="stat-card highlight">
          <div className="stat-label">🌧️ Wettest Day</div>
          <div className="stat-value precip">
            {(wettestDay.prcp_in || 0).toFixed(2)}"
          </div>
          <div className="stat-detail">
            {formatDate(wettestDay.obs_date)}
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">📅 Days Tracked</div>
          <div className="stat-value">
            {data.length}
          </div>
          <div className="stat-detail">
            {validHighs.length} with data
          </div>
        </div>

        {totalSnow > 0 && (
          <div className="stat-card highlight">
            <div className="stat-label">Total Snow</div>
            <div className="stat-value">
              {totalSnow.toFixed(1)}"
            </div>
            {normalSnowTotal > 0 && (
              <Variance value={formatPrecipVariance(totalSnow, normalSnowTotal)} />
            )}
            <div className="stat-detail">
              {snowyDays} snowy days
            </div>
          </div>
        )}



      </div>
    </div>
  );
}