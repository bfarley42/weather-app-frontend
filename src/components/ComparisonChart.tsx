// src/components/ComparisonChart.tsx
import ReactECharts from 'echarts-for-react';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
}

interface YearData {
  year: number;
  data: DailyWeather[];
  color: string;
}

interface ComparisonChartProps {
  yearsData: YearData[];
  stationName: string;
}

export default function ComparisonChart({ yearsData, stationName }: ComparisonChartProps) {
  if (!yearsData || yearsData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        No data available for comparison
      </div>
    );
  }

  // Use month-day format for x-axis (MM-DD) so years align
  const formatDateForComparison = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  // Get unique dates across all years (using MM-DD format)
  const allDates = new Set<string>();
  yearsData.forEach(yearData => {
    yearData.data.forEach(d => {
      allDates.add(formatDateForComparison(d.obs_date));
    });
  });
  const sortedDates = Array.from(allDates).sort();

  // Build series for each year
  const tempSeries: any[] = [];
  const precipSeries: any[] = [];

  yearsData.forEach((yearData, index) => {
    // Create a map of MM-DD -> data
    const dataMap = new Map<string, DailyWeather>();
    yearData.data.forEach(d => {
      dataMap.set(formatDateForComparison(d.obs_date), d);
    });

    // Map sorted dates to temps and precip
    const maxTemps = sortedDates.map(date => {
      const data = dataMap.get(date);
      return data ? data.tmax_f : null;
    });

    const minTemps = sortedDates.map(date => {
      const data = dataMap.get(date);
      return data ? data.tmin_f : null;
    });

    const precip = sortedDates.map(date => {
      const data = dataMap.get(date);
      return data ? (data.prcp_in || 0) : 0;
    });

    // Add high temp series
    tempSeries.push({
      name: `${yearData.year} High`,
      type: 'line',
      data: maxTemps,
      smooth: true,
      symbolSize: 4,
      itemStyle: { color: yearData.color },
      lineStyle: { width: 2 },
      yAxisIndex: 0
    });

    // Add low temp series
    tempSeries.push({
      name: `${yearData.year} Low`,
      type: 'line',
      data: minTemps,
      smooth: true,
      symbolSize: 4,
      itemStyle: { color: yearData.color },
      lineStyle: { width: 2, type: 'dashed' },
      yAxisIndex: 0
    });

    // Add precip series
    precipSeries.push({
      name: `${yearData.year} Precip`,
      type: 'bar',
      data: precip,
      itemStyle: {
        color: yearData.color,
        opacity: 0.4
      },
      barGap: '0%',
      yAxisIndex: 1
    });
  });

  const option = {
    title: {
      text: `${stationName} - Year Comparison`,
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
      data: [...tempSeries.map(s => s.name), ...precipSeries.map(s => s.name)],
      top: 40,
      left: 'center',
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: 110,
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
      data: sortedDates,
      boundaryGap: false,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          // Format MM-DD as M/D
          const [month, day] = value.split('-');
          return `${parseInt(month)}/${parseInt(day)}`;
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
    series: [...tempSeries, ...precipSeries]
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