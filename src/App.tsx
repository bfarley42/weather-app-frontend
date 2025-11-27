// src/App.tsx
import { useState } from 'react';
import StationSearch from './components/StationSearch';
import EnhancedWeatherChart from './components/EnhancedWeatherChart';
import WeatherSummary from './components/WeatherSummary';
import ComparisonChart from './components/ComparisonChart';
import { API_URL } from './config';
import './App.css';

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

function App() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [weatherData, setWeatherData] = useState<DailyWeather[]>([]);
  // const [startDate, setStartDate] = useState('2025-11-01');
  // const [endDate, setEndDate] = useState('2025-11-25');

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
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonYears, setComparisonYears] = useState<number[]>([2024, 2023]);
  const [yearsData, setYearsData] = useState<Array<{year: number, data: DailyWeather[], color: string}>>([]);

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

  const fetchComparisonData = async (station: Station) => {
    setIsLoading(true);
    setError(null);

    try {
      const colors = ['#ff6b6b', '#4ecdc4', '#95a5a6', '#f39c12'];
      const yearDataPromises = comparisonYears.map(async (year, index) => {
        // Adjust dates to the comparison year
        const yearStart = startDate.replace(/^\d{4}/, year.toString());
        const yearEnd = endDate.replace(/^\d{4}/, year.toString());
        
        const response = await fetch(
          `${API_URL}/api/weather/daily?station=${station.station_id}&start=${yearStart}&end=${yearEnd}`
        );
        
        if (!response.ok) {
          console.warn(`Failed to fetch ${year} data`);
          return null;
        }
        
        const data = await response.json();
        return {
          year,
          data,
          color: colors[index % colors.length]
        };
      });

      const results = await Promise.all(yearDataPromises);
      const validResults = results.filter(r => r !== null) as Array<{year: number, data: DailyWeather[], color: string}>;
      
      if (validResults.length === 0) {
        throw new Error('No data available for comparison years');
      }
      
      setYearsData(validResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setYearsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    if (comparisonMode) {
      fetchComparisonData(station);
    } else {
      fetchWeatherData(station);
    }
  };

  const handleDateChange = () => {
    if (selectedStation) {
      if (comparisonMode) {
        fetchComparisonData(selectedStation);
      } else {
        fetchWeatherData(selectedStation);
      }
    }
  };

  const toggleComparisonMode = () => {
    const newMode = !comparisonMode;
    setComparisonMode(newMode);
    
    if (selectedStation) {
      if (newMode) {
        fetchComparisonData(selectedStation);
      } else {
        fetchWeatherData(selectedStation);
      }
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

              <button 
                onClick={toggleComparisonMode} 
                className={`comparison-toggle ${comparisonMode ? 'active' : ''}`}
              >
                {comparisonMode ? '📊 Comparison Mode' : '📈 Single Year'}
              </button>
            </div>
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

        {!isLoading && !error && !comparisonMode && weatherData.length > 0 && (
          <>
            <WeatherSummary
              data={weatherData}
              stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
              startDate={startDate}
              endDate={endDate}
            />
            <div className="chart-section">
              <EnhancedWeatherChart
                data={weatherData}
                stationId={selectedStation?.station_id || ''}
                stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
              />
            </div>
          </>
        )}

        {!isLoading && !error && comparisonMode && yearsData.length > 0 && (
          <div className="chart-section">
            <ComparisonChart
              yearsData={yearsData}
              stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
            />
          </div>
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