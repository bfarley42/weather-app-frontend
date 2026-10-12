// Category-derived estimates matching api/day_summary.py SKY_FACTORS.
const skyPercentages: Record<string, number> = { CLR: 0, SKC: 0, FEW: 18, SCT: 44, BKN: 75, OVC: 100 };

export function estimatedCloudCover(code: string | null): number | null {
  return code ? skyPercentages[code.toUpperCase()] ?? null : null;
}

export function historicalCloudSummary(data: { skyc1: string | null }[]) {
  const values = data.map(hour => estimatedCloudCover(hour.skyc1)).filter((value): value is number => value != null);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  // toFixed handles the actual binary value; exact decimal half-ties that are
  // binary-representable end in .25 or .75 and need Python's half-even rule.
  const base = Math.floor(average * 10);
  const rounded = Number.isInteger(average * 4) && !Number.isInteger(average * 2)
    ? (base + base % 2) / 10 : Number(average.toFixed(1));
  return {
    avgCloudCover: values.length ? rounded : null,
    observedCount: values.length,
    clearHours: values.filter(value => value <= 25).length,
    cloudyHours: values.filter(value => value > 25 && value <= 75).length,
    overcastHours: values.filter(value => value > 75).length,
  };
}
