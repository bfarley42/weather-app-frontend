// src/App.tsx
import { useState } from 'react';
import StationSearch from './components/StationSearch';
import EnhancedWeatherChart from './components/EnhancedWeatherChart';
import PrecipitationChart from './components/PrecipitationChart';
import WeatherSummary from './components/WeatherSummary';
import { API_URL } from './config';
import './App.css';
import HourlyWeatherChart from './components/HourlyWeatherChart';
import Top10Chart from './components/Top10Chart';
import InteractiveStationMap from './components/InteractiveStationMap';
import WeatherLandingPage from './components/WeatherLandingPage';
import { Thermometer, CloudRain, Clock, Trophy, Map, Moon } from 'lucide-react';

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
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null;
}

function App() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [weatherData, setWeatherData] = useState<DailyWeather[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    return fourteenDaysAgo.toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'temperature' | 'precipitation' | 'hourly' | 'map' | 'top10'>('temperature');
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'search' | 'chart'>('landing');
  

  const fetchWeatherData = async (station: Station, customStartDate?: string, customEndDate?: string) => {
    setIsLoading(true);
    setError(null);

    const fetchStart = customStartDate || startDate;
    const fetchEnd = customEndDate || endDate;

    try {
      const response = await fetch(
        `${API_URL}/api/weather/daily?station=${station.station_id}&start=${fetchStart}&end=${fetchEnd}`
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

  const fetchHourlyData = async (station: Station, customStartDate?: string, customEndDate?: string) => {
    setIsLoading(true);
    setError(null);

    const fetchStart = customStartDate || startDate;
    const fetchEnd = customEndDate || endDate;

        // DEBUG: Log what we're fetching
    console.log('Fetching hourly data:', {
      station: station.station_id,
      fetchStart,
      fetchEnd,
      customStartDate,
      customEndDate,
      stateStartDate: startDate,
      stateEndDate: endDate
    });

  //   try {
  //     const response = await fetch(
  //       `${API_URL}/api/weather/hourly?station=${station.station_id}&start=${fetchStart}&end=${fetchEnd}`
  //     );
      
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch hourly weather data');
  //     }

  //     const data = await response.json();
  //     setHourlyData(data);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'An error occurred');
  //     setHourlyData([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
      try {
      const url = `${API_URL}/api/weather/hourly?station=${station.station_id}&start=${fetchStart}&end=${fetchEnd}`;
      console.log('Hourly API URL:', url);  // DEBUG
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch hourly weather data');
      }

      const data = await response.json();
      console.log('Hourly data received:', data.length, 'records');  // DEBUG
      console.log('First record:', data[0]);  // DEBUG
      console.log('Last record:', data[data.length - 1]);  // DEBUG
      
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
    setCurrentView('chart');
  };
 


  // Handle End Date change - auto-update Start Date to 14 days prior
  const handleEndDateChange = (newEndDate: string) => {
    const end = new Date(newEndDate);
    const start = new Date(end);
    start.setDate(end.getDate() - 14);
    
    const newStartDate = start.toISOString().split('T')[0];
    
    setEndDate(newEndDate);
    setStartDate(newStartDate);
  };

  const handleUpdateClick = () => {
    if (selectedStation) {
      if (chartView === 'hourly') {
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

  const handleChartViewChange = (view: 'temperature' | 'precipitation' | 'hourly' | 'map') => {
    setChartView(view);
    setError(null);
    
    if (view === 'hourly' && selectedStation) {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);  // Default to 3D
      
      const newStart = threeDaysAgo.toISOString().split('T')[0];
      const newEnd = today.toISOString().split('T')[0];
      
      setStartDate(newStart);
      setEndDate(newEnd);
      
      setTimeout(() => fetchHourlyData(selectedStation, newStart, newEnd), 100);
    }
  };

const handleDateRangeChange = (range: string) => {
    if (!selectedStation) return;
    
    const end = new Date(endDate);
    let start = new Date(end);
    
    switch (range) {
      case '1D':
        start.setDate(end.getDate() - 1);
        break;
      case '3D':
        start.setDate(end.getDate() - 3);
        break;
      case '7D':
        start.setDate(end.getDate() - 7);
        break;
      case '10D':
        start.setDate(end.getDate() - 10);
        break;
      case '14D':
        start.setDate(end.getDate() - 14);
        break;
      case 'MTD':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case '1M':
        start.setMonth(end.getMonth() - 1);
        break;
      case '3M':
        start.setMonth(end.getMonth() - 3);
        break;
      case '6M':
        start.setMonth(end.getMonth() - 6);
        break;
      case 'YTD':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      case '1Y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        return;
    }
        
    const newStartDate = start.toISOString().split('T')[0];
    
    if (newStartDate === startDate) {
      return;
    }
    
    setStartDate(newStartDate);
    
    const fetchWithNewDates = async () => {
      setError(null);
      
      try {
        const url = chartView === 'hourly'
          ? `${API_URL}/api/weather/hourly?station=${selectedStation.station_id}&start=${newStartDate}&end=${endDate}`
          : `${API_URL}/api/weather/daily?station=${selectedStation.station_id}&start=${newStartDate}&end=${endDate}`;
        
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${chartView} weather data`);
        }

        const data = await response.json();
        
        if (chartView === 'hourly') {
          setHourlyData(data);
        } else {
          setWeatherData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (chartView === 'hourly') {
          setHourlyData([]);
        } else {
          setWeatherData([]);
        }
      }
    };
    
    fetchWithNewDates();
  };

  const handleBackToSearch = () => {
    setCurrentView('landing');
  };

  // Landing page renders full-screen (outside normal app layout)
  if (currentView === 'landing') {
    return (
      <WeatherLandingPage
        onStationSelect={handleStationSelect}
        apiBaseUrl={API_URL}
      />
    );
  }

  // Search and Chart views use normal app layout
  return (
    <div className="app">
      {/* Video background */}
      <div className="app-video-bg">
        <video autoPlay muted loop playsInline>
          <source src="/clouds.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay" />
      </div>

      <header className="app-header">
        <h1 onClick={() => setCurrentView('landing')} style={{ cursor: 'pointer' }}>
          🌤️ Historical Weather Viewer
        </h1>
        <p>Explore weather patterns from thousands of stations</p>
      </header>

      <main className="app-main">
        {currentView === 'search' ? (
          // SEARCH VIEW
          <div className="controls-section">
            <div className="control-group">
              <label>Search Station:</label>
              <StationSearch onSelectStation={handleStationSelect} />
            </div>

            {selectedStation && (
              <div className="date-controls">
                <div className="control-group">
                  <label htmlFor="end-date">End Date:</label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="date-input"
                  />
                </div>

                <button onClick={handleUpdateClick} className="update-button">
                  Update Chart
                </button>
              </div>
            )}

            {!selectedStation && (
              <div className="empty-state">
                <h2>👆 Search for a weather station to get started</h2>
                <p>Try searching for your city or airport code</p>
              </div>
            )}
          </div>
        ) : (
          // CHART VIEW
          <>
            {/* Row 1: Home button + End Date (aligned) */}
            <div className="chart-top-controls">
              <button onClick={handleBackToSearch} className="back-button">
                ← Home
              </button>

              <div className="end-date-group">
                <label htmlFor="chart-end-date">End Date:</label>
                <input
                  id="chart-end-date"
                  type="date"
                  value={endDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            {/* Row 2: Station Search with Map button */}
            <div className="station-search-box">
              <label>Change Station:</label>
              <StationSearch onSelectStation={handleStationSelect} />
              <button
                className={`map-button ${chartView === 'map' ? 'active' : ''}`}
                onClick={() => handleChartViewChange('map')}
                title="Find station on map"
              >
                <Map size={20} />
              </button>
            </div>

{/* Row 3: Update button */}
            <div className="update-row">
              <button onClick={handleUpdateClick} className="update-button">
                Update Chart
              </button>
            </div>

            {/* Chart View Icons - Below Update Button */}
            {selectedStation && weatherData.length > 0 && (
              <div className="chart-view-icons">
                <span className="chart-view-label">Chart Selection</span>
                <button
                  className={`icon-button ${chartView === 'temperature' ? 'active' : ''}`}
                  onClick={() => handleChartViewChange('temperature')}
                  title="Temperature"
                >
                  <Thermometer size={24} />
                </button>
                <button
                  className={`icon-button ${chartView === 'precipitation' ? 'active' : ''}`}
                  onClick={() => handleChartViewChange('precipitation')}
                  title="Precipitation & Snow"
                >
                  <CloudRain size={24} />
                </button>
                <button
                  className={`icon-button ${chartView === 'hourly' ? 'active' : ''}`}
                  onClick={() => handleChartViewChange('hourly')}
                  title="Hourly"
                >
                  <Clock size={24} />
                </button>
                <button
                  className={`icon-button ${chartView === 'top10' ? 'active' : ''}`}
                  onClick={() => setChartView('top10')}
                  title="Top 10"
                >
                  <Trophy size={24} />
                </button>
                {/* <button
                  className={`icon-button ${chartView === 'map' ? 'active' : ''}`}
                  onClick={() => handleChartViewChange('map')}
                  title="Map"
                >
                  <Map size={24} />
                </button> */}
              </div>
            )}

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


                <div className={chartView === 'precipitation' ? 'chart-section-precip' : 'chart-section'}>
                  {chartView === 'temperature' ? (
                    <EnhancedWeatherChart
                      key="temperature-chart"
                      data={weatherData}
                      stationId={selectedStation?.station_id || ''}
                      stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                      darkMode={darkMode}
                      startDate={startDate}
                      endDate={endDate}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  ) : chartView === 'precipitation' ? (
                    <PrecipitationChart
                      key="precipitation-chart"
                      data={weatherData}
                      stationId={selectedStation?.station_id || ''}
                      stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                      darkMode={darkMode}
                      startDate={startDate}
                      endDate={endDate}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  ) : chartView === 'hourly' ? (
                    <HourlyWeatherChart
                      key="hourly-chart"
                      data={hourlyData}
                      stationName={selectedStation?.name || selectedStation?.station_id || 'Weather Station'}
                      darkMode={darkMode}
                      startDate={startDate}
                      endDate={endDate}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  ) : chartView === 'top10' ? (
                    <Top10Chart
                      stationId={selectedStation?.station_id || ''}
                      stationName={selectedStation?.name || 'Weather Station'}
                      darkMode={darkMode}
                    />
                  ) : (
                    <InteractiveStationMap
                      startDate={startDate}
                      endDate={endDate}
                      darkMode={darkMode}
                      metric="tmax"
                      selectedStation={selectedStation!}
                      onStationSelect={(station) => {
                        setSelectedStation(station);
                        fetchWeatherData(station);
                        setChartView('temperature');
                      }}
                    />
                  )}
                </div>
                <WeatherSummary 
                  data={weatherData}
                  stationId={selectedStation?.station_id || ''}
                  stationName={selectedStation?.name || ''}
                  startDate={startDate}
                  endDate={endDate}
                  darkMode={darkMode}
                />
                {/* Dark Mode Toggle - Bottom */}
                <div className="dark-mode-footer">
                  <button
                    className={`dark-mode-button ${darkMode ? 'active' : ''}`}
                    onClick={() => setDarkMode(!darkMode)}
                    title="Toggle Dark Mode"
                  >
                    <Moon size={18} />
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>

                {/* <div className="chart-view-selector">
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
                  <button
                    className={chartView === 'top10' ? 'active' : ''}
                    onClick={() => setChartView('top10')}
                  >
                    🏆 Top 10
                  </button>
                  <button
                    className={chartView === 'map' ? 'active' : ''}
                    onClick={() => handleChartViewChange('map')}
                  >
                    🗺️ Map
                  </button>
                </div> */}


              </>
            )}
          </>
        )}
      </main>
    </div>

);
}

export default App;