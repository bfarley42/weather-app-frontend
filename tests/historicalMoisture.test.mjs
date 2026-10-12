import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoricalMoisture, moistureStatistics } from '../src/utils/historicalMoisture.ts';

const date = '2026-10-09';
const row = (hour, humidity, dew) => ({ ts_local: `${date}T${String(hour).padStart(2, '0')}:00:00`, relh_pct: humidity, dwpf: dew, tmpf: null });

test('zeros, humidity bounds, and negative Fahrenheit dew points are preserved', () => {
  const data = parseHistoricalMoisture([row(0, 0, -10), row(1, 100, 0)], date);
  assert.deepEqual(moistureStatistics(data, 'relh_pct'), { count: 2, average: 50, high: 100, low: 0 });
  assert.deepEqual(moistureStatistics(data, 'dwpf'), { count: 2, average: -5, high: 0, low: -10 });
});
test('missing and omitted values stay null', () => {
  const data = parseHistoricalMoisture([row(0, null, null), { ts_local: `${date}T01:00:00` }], date);
  assert.equal(data[1].dwpf, null);
  assert.equal(data[1].relh_pct, null);
  assert.deepEqual(moistureStatistics(data, 'dwpf'), { count: 0, average: null, high: null, low: null });
});
test('empty days have no statistics', () => {
  assert.equal(moistureStatistics([], 'relh_pct').average, null);
});
test('humidity and dew point averages exclude missing readings independently', () => {
  const data = parseHistoricalMoisture([row(0, 40, null), row(1, null, 50), row(2, 80, 60)], date);
  assert.equal(moistureStatistics(data, 'relh_pct').average, 60);
  assert.equal(moistureStatistics(data, 'dwpf').average, 55);
});
test('out-of-range humidity is rejected without clamping or fabrication', () => {
  for (const humidity of [-1, 101, Infinity, '50']) assert.throws(() => parseHistoricalMoisture([row(0, humidity, 40)], date), /Invalid relh_pct/);
});
test('invalid dew point measurements are rejected', () => {
  for (const dew of [NaN, Infinity, '50']) assert.throws(() => parseHistoricalMoisture([row(0, 50, dew)], date), /Invalid dwpf/);
});
test('wrong dates and malformed response shapes are rejected', () => {
  for (const data of [null, {}, [null], [{ ts_local: '2026-10-10T00:00:00', relh_pct: 60 }]]) assert.throws(() => parseHistoricalMoisture(data, date));
});
test('averages use hourly means and existing whole-number display rounding', () => {
  const data = parseHistoricalMoisture([row(0, 55.34, 47), row(1, 55.35, 47.34)], date);
  assert.equal(Math.round(moistureStatistics(data, 'relh_pct').average), 55);
  assert.equal(Math.round(moistureStatistics(data, 'dwpf').average), 47);
});
