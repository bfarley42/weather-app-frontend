import { useState, useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
// import * as echarts from 'echarts';
// import { API_URL } from '../config'; // Uncomment when ready for real data
import './StationScatterChart.css'; // You'll need to create this simple CSS file

// --- Types ---
interface StationData {
  id: string;
  name: string;
  state: string;
  elevation: number;
  latitude: number;
  // The metrics we are analyzing
  tempChange: number; // Y-axis: e.g., 10-year delta
  avgAnnualTemp: number; // X-axis: Baseline climate
  population: number; // Z-axis: Bubble size (optional)
}

interface StationScatterChartProps {
  darkMode?: boolean;
}

export default function StationScatterChart({ darkMode = false }: StationScatterChartProps) {
  const [data, setData] = useState<StationData[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const chartRef = useRef<ReactECharts>(null);

  // --- 1. Generate Realistic Mock Data (Replace with API call later) ---
  useEffect(() => {
    const states = ['AK', 'WA', 'OR', 'CA', 'AZ', 'NV', 'ID', 'MT'];
    const mockData: StationData[] = Array.from({ length: 400 }).map((_, i) => {
      const lat = 30 + Math.random() * 40; // 30° to 70° latitude
      // Correlation: Higher latitude -> Higher warming (Polar amplification)
      const baseWarming = (lat - 30) * 0.05; 
      const noise = (Math.random() - 0.5) * 2;
      
      return {
        id: `st-${i}`,
        name: `Station ${i + 100}`,
        state: states[Math.floor(Math.random() * states.length)],
        elevation: Math.floor(Math.random() * 5000),
        latitude: lat,
        avgAnnualTemp: 70 - (lat - 30) * 1.2 + (Math.random() * 10), // Colder as you go north
        tempChange: 1.0 + baseWarming + noise, // Change in last 10 years
        population: Math.floor(Math.exp(Math.random() * 10) * 100) // Log distribution
      };
    });
    setData(mockData);
  }, []);

  // --- 2. Mobile Detection ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- 3. "Virtual Voronoi" Click Handler ---
  // This finds the nearest point even if the user clicks empty space
  const handleZrClick = (params: any) => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (!chartInstance || !params) return;

    const pointInPixel = [params.offsetX, params.offsetY];
    
    // Get all points in pixel coordinates
    // '0' is the seriesIndex of our scatter plot
    // @ts-ignore - 'getModel' is private but stable in ECharts API for this use case
    const seriesModel = chartInstance.getModel().getSeriesByIndex(0);
    // const dataIndex = seriesModel.getData().indexOfNearest('x', pointInPixel[0]);
    
    // Wait, ECharts has a simpler native API for coordinate conversion:
    const option = chartInstance.getOption() as any;
    const data = option.series[0].data; // Access raw data from option
    
    let minDistance = Infinity;
    let nearestIndex = -1;

    // Iterate to find closest point (fast enough for <2000 points)
    for (let i = 0; i < data.length; i++) {
      const pixelPoint = chartInstance.convertToPixel({ seriesIndex: 0 }, [data[i][0], data[i][1]]);
      if (pixelPoint) {
        const dx = pointInPixel[0] - pixelPoint[0];
        const dy = pointInPixel[1] - pixelPoint[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
    }

    // Threshold: Only select if click is within 60 pixels (generous mobile touch area)
    if (nearestIndex !== -1 && minDistance < 60) {
      // Reconstruct the full data object based on the finding
      // Note: In ECharts data array, we usually store [x, y, originalObject]
      const foundItem = data[nearestIndex][2]; 
      setSelectedStation(foundItem);
      
      // Visual Feedback: Highlight the selected point
      chartInstance.dispatchAction({
        type: 'highlight',
        seriesIndex: 0,
        dataIndex: nearestIndex
      });
      
      // Optional: Downplay others
      chartInstance.dispatchAction({
        type: 'downplay',
        seriesIndex: 0,
        dataIndex: data.map((_: any, idx: number) => idx).filter((i: number) => i !== nearestIndex)
      });
    } else {
      // Clicked far away - clear selection
      setSelectedStation(null);
      chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    }
  };


  // --- 4. Chart Configuration ---
  const option = useMemo(() => {
    // Transform data for ECharts: [X, Y, FullObject]
    const scatterData = data.map(item => [
      item.avgAnnualTemp, 
      item.tempChange, 
      item // We store the full object at index 2 to retrieve it later
    ]);

    return {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      grid: {
        top: 40,
        right: 20,
        bottom: 30,
        left: 40,
        containLabel: true
      },
      // Allow panning and zooming (Critical for mobile)
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'filter'
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'empty'
        }
      ],
      xAxis: {
        type: 'value',
        name: 'Avg Annual Temp (°F)',
        nameLocation: 'middle',
        nameGap: 25,
        scale: true, // Don't start at 0 if not needed
        axisLine: { lineStyle: { color: darkMode ? '#555' : '#ccc' } },
        axisLabel: { color: darkMode ? '#ccc' : '#666' },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '10-Year Change (°F)',
        nameLocation: 'middle',
        nameGap: 35,
        scale: true,
        axisLine: { lineStyle: { color: darkMode ? '#555' : '#ccc' } },
        axisLabel: { color: darkMode ? '#ccc' : '#666' },
        splitLine: { 
          lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } 
        }
      },
      // Disable standard tooltip in favor of our "Card" below
      tooltip: {
        show: false 
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: (val: any) => {
            // Dynamic size based on population (Log scale for visualization)
            // val[2] is our full station object
            const pop = val[2].population;
            const size = Math.log(pop) * 1.5; 
            return Math.max(4, Math.min(size, 20)); // Clamp between 4px and 20px
          },
          itemStyle: {
            // Dynamic color based on Value (Redder = More warming)
            color: (params: any) => {
              const val = params.value[1]; // Y-axis value (Change)
              if (val > 3) return '#e74c3c'; // Hot red
              if (val > 1.5) return '#e67e22'; // Orange
              if (val > 0) return '#f1c40f'; // Yellow
              return '#3498db'; // Blue (Cooling)
            },
            shadowBlur: 2,
            shadowColor: 'rgba(0,0,0,0.3)',
            opacity: 0.8
          },
          // Highlight state (when selected)
          emphasis: {
            focus: 'self',
            scale: true,
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2,
              shadowBlur: 10,
              opacity: 1
            }
          }
        }
      ]
    };
  }, [data, darkMode, isMobile]);

  return (
    <div className={`scatter-tool-container ${darkMode ? 'dark' : ''}`} style={{ 
      fontFamily: '-apple-system, system-ui, sans-serif',
      background: darkMode ? '#1a1a2e' : '#fff',
      padding: '15px',
      borderRadius: '12px'
    }}>
      
      {/* 1. Header Area */}
      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
        <h3 style={{ 
          margin: 0, 
          color: darkMode ? '#ecf0f1' : '#2c3e50',
          fontSize: isMobile ? '16px' : '20px'
        }}>
          Climate Change Explorer
        </h3>
        <p style={{ 
          margin: '5px 0 0 0', 
          color: darkMode ? '#95a5a6' : '#7f8c8d', 
          fontSize: '12px' 
        }}>
          Tap any dot to view station details
        </p>
      </div>

      {/* 2. Chart Area */}
      <div style={{ 
        height: isMobile ? '400px' : '500px', 
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${darkMode ? '#333' : '#eee'}`
      }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          // This is where we attach our custom click handler
          onEvents={{
            'zr:click': handleZrClick
          }}
        />
      </div>

      {/* 3. The "Detail Card" (Drill-down) */}
      <div style={{
        marginTop: '15px',
        minHeight: '100px',
        background: darkMode ? '#252540' : '#f8f9fa',
        borderRadius: '12px',
        padding: '15px',
        border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        transition: 'all 0.3s ease',
        transform: selectedStation ? 'translateY(0)' : 'translateY(10px)',
        opacity: selectedStation ? 1 : 0.6
      }}>
        {selectedStation ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}`, paddingBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: darkMode ? '#fff' : '#222', fontSize: '16px' }}>
                {selectedStation.name}, {selectedStation.state}
              </span>
              <span style={{ 
                fontSize: '11px', 
                background: darkMode ? '#444' : '#ddd', 
                padding: '2px 6px', 
                borderRadius: '4px',
                color: darkMode ? '#ccc' : '#555'
              }}>
                ID: {selectedStation.id}
              </span>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: darkMode ? '#999' : '#666' }}>10-Year Change</div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: selectedStation.tempChange > 0 ? '#e74c3c' : '#3498db' 
                }}>
                  {selectedStation.tempChange > 0 ? '+' : ''}{selectedStation.tempChange.toFixed(2)}°F
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: darkMode ? '#999' : '#666' }}>Annual Avg</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: darkMode ? '#eee' : '#333' }}>
                  {selectedStation.avgAnnualTemp.toFixed(1)}°F
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: darkMode ? '#999' : '#666' }}>Elevation</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: darkMode ? '#ccc' : '#444' }}>
                  {selectedStation.elevation.toLocaleString()} ft
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: darkMode ? '#999' : '#666' }}>Latitude</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: darkMode ? '#ccc' : '#444' }}>
                  {selectedStation.latitude.toFixed(2)}°N
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: darkMode ? '#666' : '#999',
            fontStyle: 'italic'
          }}>
            Select a station on the chart to see details
          </div>
        )}
      </div>

    </div>
  );
}