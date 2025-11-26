// src/components/WeatherSummary.tsx
import './WeatherSummary.css';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in: number | null;
}

interface WeatherSummaryProps {
  data: DailyWeather[];
  stationName: string;
  startDate: string;
  endDate: string;
}

export default function WeatherSummary({ data, stationName, startDate, endDate }: WeatherSummaryProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate statistics
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

  return (
    <div className="weather-summary">
      <div className="summary-header">
        <h2>{stationName}</h2>
        <p className="date-range">{formatDateRange(startDate, endDate)}</p>
      </div>

      <div className="summary-grid">
        <div className="stat-card highlight">
          <div className="stat-label">Avg High</div>
          <div className="stat-value temp-high">
            {avgHigh !== null ? `${avgHigh.toFixed(1)}°F` : 'N/A'}
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Avg Low</div>
          <div className="stat-value temp-low">
            {avgLow !== null ? `${avgLow.toFixed(1)}°F` : 'N/A'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Hottest Day</div>
          <div className="stat-value">
            {maxHigh !== null ? `${maxHigh.toFixed(0)}°F` : 'N/A'}
          </div>
          <div className="stat-detail">
            {formatDate(hottestDay.obs_date)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Coldest Day</div>
          <div className="stat-value">
            {minLow !== null ? `${minLow.toFixed(0)}°F` : 'N/A'}
          </div>
          <div className="stat-detail">
            {formatDate(coldestDay.obs_date)}
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Total Precip</div>
          <div className="stat-value precip">
            {totalPrecip.toFixed(2)}"
          </div>
          <div className="stat-detail">
            {rainyDays} rainy days
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Wettest Day</div>
          <div className="stat-value">
            {(wettestDay.prcp_in || 0).toFixed(2)}"
          </div>
          <div className="stat-detail">
            {formatDate(wettestDay.obs_date)}
          </div>
        </div>

        {totalSnow > 0 && (
          <>
            <div className="stat-card">
              <div className="stat-label">Total Snow</div>
              <div className="stat-value">
                {totalSnow.toFixed(1)}"
              </div>
              <div className="stat-detail">
                {snowyDays} snowy days
              </div>
            </div>
          </>
        )}

        <div className="stat-card">
          <div className="stat-label">Days Tracked</div>
          <div className="stat-value">
            {data.length}
          </div>
          <div className="stat-detail">
            {validHighs.length} with data
          </div>
        </div>
      </div>
    </div>
  );
}