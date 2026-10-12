export interface HourlyMoisture {
  ts_local: string;
  relh_pct: number | null;
  dwpf: number | null;
  tmpf: number | null;
}

export function parseHistoricalMoisture(rows: unknown, date: string): HourlyMoisture[] {
  if (!Array.isArray(rows)) throw new Error('Invalid hourly observations');
  return rows.map((row: unknown) => {
    if (!row || typeof row !== 'object' || !('ts_local' in row) || typeof row.ts_local !== 'string' || row.ts_local.slice(0, 10) !== date) {
      throw new Error('Hourly observations do not match the selected date');
    }
    const value = (field: 'relh_pct' | 'dwpf' | 'tmpf') => {
      const number = (row as Record<string, unknown>)[field];
      if (number == null) return null;
      if (typeof number !== 'number' || !Number.isFinite(number) || (field === 'relh_pct' && (number < 0 || number > 100))) {
        throw new Error(`Invalid ${field} measurement`);
      }
      return number;
    };
    return { ts_local: row.ts_local, relh_pct: value('relh_pct'), dwpf: value('dwpf'), tmpf: value('tmpf') };
  });
}

export function moistureStatistics(data: HourlyMoisture[], field: 'relh_pct' | 'dwpf') {
  const values = data.map(hour => hour[field]).filter((value): value is number => value != null);
  return {
    count: values.length,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    high: values.length ? Math.max(...values) : null,
    low: values.length ? Math.min(...values) : null,
  };
}
