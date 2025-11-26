// src/components/WeatherChart.tsx
import ReactECharts from 'echarts-for-react';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
}

interface WeatherChartProps {
  data: DailyWeather[];
  stationName: string;
}

export default function WeatherChart({ data, stationName }: WeatherChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        No data available for the selected date range
      </div>
    );
  }

  // Prepare data for chart
  const dates = data.map(d => d.obs_date);
  const maxTemps = data.map(d => d.tmax_f);
  const minTemps = data.map(d => d.tmin_f);
  const precip = data.map(d => d.prcp_in || 0);

  const option = {
    title: {
      text: stationName,
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((param: any) => {
          const value = param.value !== null ? param.value : 'N/A';
          const unit = param.seriesName.includes('Precip') ? ' in' : '°F';
          result += `${param.marker} ${param.seriesName}: ${value}${value !== 'N/A' ? unit : ''}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['High Temp', 'Low Temp', 'Precipitation'],
      top: 40,
      left: 'center'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: 100,
      containLabel: true
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 30,
        bottom: 10
      }
    ],
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          // Format date as MM/DD
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Temperature (°F)',
        position: 'left',
        axisLabel: {
          formatter: '{value}°F'
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      {
        type: 'value',
        name: 'Precipitation (in)',
        position: 'right',
        axisLabel: {
          formatter: '{value} in'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: 'High Temp',
        type: 'line',
        data: maxTemps,
        smooth: true,
        symbolSize: 6,
        itemStyle: {
          color: '#ff6b6b'
        },
        lineStyle: {
          width: 2
        },
        yAxisIndex: 0
      },
      {
        name: 'Low Temp',
        type: 'line',
        data: minTemps,
        smooth: true,
        symbolSize: 6,
        itemStyle: {
          color: '#4ecdc4'
        },
        lineStyle: {
          width: 2
        },
        yAxisIndex: 0
      },
      {
        name: 'Precipitation',
        type: 'bar',
        data: precip,
        itemStyle: {
          color: '#95a5a6',
          opacity: 0.6
        },
        barWidth: '60%',
        yAxisIndex: 1
      }
    ]
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}