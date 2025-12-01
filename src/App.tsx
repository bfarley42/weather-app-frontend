// src/App.tsx
import { useState } from 'react';
import StationSearch from './components/StationSearch';
import EnhancedWeatherChart from './components/EnhancedWeatherChart';
import PrecipitationChart from './components/PrecipitationChart';
import WeatherSummary from './components/WeatherSummary';
import { API_URL } from './config';
import './App.css';
import HourlyWeatherChart from './components/HourlyWeatherChart';

interface Station {
  station_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in: number | null;
}

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
}

function App() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [weatherData, setWeatherData] = useState<DailyWeather[]>([]);
  // const [chartView, setChartView] = useState<'temperature' | 'precipitation' | 'hourly'>('temperature');
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  // const [startDate, setStartDate] = useState('2024-11-01');
  // const [endDate, setEndDate] = useState('2024-11-25');
  const [startDate, setStartDate] = useState(() => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
});
const [endDate, setEndDate] = useState(() => {
  const now = new Date();
  return now.toISOString().split('T')[0];
});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'temperature' | 'precipitation' | 'hourly'>('temperature');
  const [darkMode, setDarkMode] = useState(false);

  const fetchWeatherData = async (station: Station) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/weather/daily?station=${station.station_id}&start=${startDate}&end=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setWeatherData([]);
    } finally {
      setIsLoading(false);
    }
  };

const fetchHourlyData = async (station: Station) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch(
      `${API_URL}/api/weather/hourly?station=${station.station_id}&start=${startDate}&end=${endDate}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch hourly weather data');
    }

    const data = await response.json();
    setHourlyData(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
    setHourlyData([]);
  } finally {
    setIsLoading(false);
  }
};

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    fetchWeatherData(station);
  };

const handleDateChange = () => {
  if (selectedStation) {
    if (chartView === 'hourly') {
      // Check if date range is valid for hourly (max 7 days)
      const daysDiff = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 7) {
        setError('Hourly view limited to 7 days. Please adjust date range.');
        return;
      }
      fetchHourlyData(selectedStation);
    } else {
      fetchWeatherData(selectedStation);
    }
  }
};

const handleChartViewChange = (view: 'temperature' | 'precipitation' | 'hourly') => {
  setChartView(view);
  setError(null);
  
  // Auto-adjust dates for hourly view
  if (view === 'hourly' && selectedStation) {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    // Fetch hourly data
    setTimeout(() => fetchHourlyData(selectedStation), 100);
  }
};

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌤️ Historical Weather Viewer</h1>
        <p>Explore weather patterns from thousands of stations</p>
      </header>

      <main className="app-main">
        <div className="controls-section">
          <div className="control-group">
            <label>Search Station:</label>
            <StationSearch onSelectStation={handleStationSelect} />
          </div>

          {selectedStation && (
            <>
              <div className="date-controls">
                <div className="control-group">
                  <label htmlFor="start-date">Start Date:</label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>

                <div className="control-group">
                  <label htmlFor="end-date">End Date:</label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>

                <button onClick={handleDateChange} className="update-button">
                  Update Chart
                </button>
              </div>
            </>
          )}
        </div>

        {isLoading && (
          <div className="loading-message">
            Loading weather data...
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {!isLoading && !error && weatherData.length > 0 && selectedStation && (
          <>
            <WeatherSummary
              data={weatherData}
              stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
              startDate={startDate}
              endDate={endDate}
            />
            
            {/* Dark mode toggle above chart */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '20px',
              marginBottom: '10px'
            }}>
              <label className="toggle-label dark-mode-toggle">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span>🌙 Dark Mode</span>
              </label>
            </div>

            <div className="chart-section">
              {chartView === 'temperature' ? (
                <EnhancedWeatherChart
                  data={weatherData}
                  stationId={selectedStation?.station_id || ''}
                  stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                  darkMode={darkMode}
                />
              ) : chartView === 'precipitation' ? (
                <PrecipitationChart
                  data={weatherData}
                  stationId={selectedStation?.station_id || ''}
                  stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                  darkMode={darkMode}
                />
              ) : (
                <HourlyWeatherChart
                  data={hourlyData}
                  stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                  darkMode={darkMode}
                />
              )}
            </div>

            {/* Chart View Selector below chart */}
            <div className="chart-view-selector">
              <button
                className={chartView === 'temperature' ? 'active' : ''}
                onClick={() => handleChartViewChange('temperature')}
              >
                🌡️ Temperature
              </button>
              <button
                className={chartView === 'precipitation' ? 'active' : ''}
                onClick={() => handleChartViewChange('precipitation')}
              >
                🌧️ Precip & Snow
              </button>
              <button
                className={chartView === 'hourly' ? 'active' : ''}
                onClick={() => handleChartViewChange('hourly')}
              >
                ⏰ Hourly
              </button>
            </div>
          </>
        )}

        {!selectedStation && !isLoading && (
          <div className="empty-state">
            <h2>👆 Search for a weather station to get started</h2>
            <p>Try searching for your city or airport code</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;