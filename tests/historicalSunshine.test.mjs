import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historicalSunshine, sunshineAttenuation } from '../src/utils/historicalSunshine.ts';

const date = '2026-10-09';
const day = { station_id: 'KORD', local_date: date, timezone: 'America/Chicago', sunrise: `${date}T06:57:45.741855-05:00`, sunset: `${date}T18:19:25.444484-05:00` };
const row = (hour, skyc1 = 'CLR', wxcodes = null) => ({ ts_local: `${date}T${String(hour).padStart(2, '0')}:00:00`, skyc1, wxcodes });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.005, `${actual} != ${expected}`);

test('partial sunrise and sunset buckets use exact daylight overlap', () => {
  const result = historicalSunshine([row(6), row(18)], day);
  assert.ok(result.buckets[0].daylightHours > 0 && result.buckets[0].daylightHours < 0.04);
  assert.ok(result.buckets[1].daylightHours > 0.32 && result.buckets[1].daylightHours < 0.33);
  near(result.estimatedHours, result.coveredDaylightHours);
});
test('night observations contribute no sunshine or covered daylight', () => {
  const result = historicalSunshine([row(0), row(23)], day);
  assert.equal(result.estimatedHours, null);
  assert.equal(result.coveredDaylightHours, 0);
  assert.deepEqual(result.buckets.map(b => b.estimatedHours), [0, 0]);
});
test('missing and unknown sky are excluded, not treated as sunshine or darkness', () => {
  const result = historicalSunshine([row(9, null), row(10, 'VV'), row(11)], day);
  assert.equal(result.estimatedHours, 1);
  assert.equal(result.coveredDaylightHours, 1);
  assert.equal(result.estimatedPct, 100);
  assert.equal(result.buckets[0].estimatedHours, null);
});
test('empty and all-missing days have no sunshine estimate', () => {
  assert.equal(historicalSunshine([], day).estimatedHours, null);
  assert.equal(historicalSunshine([row(12, null)], day).estimatedPct, null);
});
test('overcast and weather coefficients match the unchanged backend', () => {
  assert.equal(historicalSunshine([row(12, 'OVC')], day).estimatedHours, 0.05);
  assert.equal(historicalSunshine([row(12, 'CLR', 'TSRA')], day).estimatedHours, 0);
  assert.equal(sunshineAttenuation('-RA'), 0.1);
  assert.equal(sunshineAttenuation('+RA'), 0.05);
  assert.equal(sunshineAttenuation('BR'), 0.7);
});
test('wrong dates, sky formats, and unavailable historical sun times are rejected', () => {
  assert.throws(() => historicalSunshine([{ ...row(12), ts_local: '2026-10-10T12:00:00' }], day));
  assert.throws(() => historicalSunshine([row(12, 50)], day));
  assert.throws(() => historicalSunshine([], { ...day, sunrise: null }));
  assert.throws(() => historicalSunshine([], { ...day, sunset: '2026-10-10T18:00:00-05:00' }));
});
test('duplicate known buckets do not inflate coverage or sunshine', () => {
  assert.equal(historicalSunshine([row(12), row(12)], day).estimatedHours, 1);
  assert.equal(historicalSunshine([row(12, null), row(12)], day).estimatedHours, 1);
});
test('KORD October 9 matches the historical daily endpoint', () => {
  const codes = ['BKN','OVC','BKN','OVC','OVC','BKN','OVC','OVC','OVC','CLR','BKN','CLR','CLR','CLR','FEW','FEW','CLR','CLR','BKN','FEW','BKN','SCT','SCT','OVC'];
  const result = historicalSunshine(codes.map((sky, hour) => row(hour, sky, hour === 14 ? '-RA' : null)), day);
  near(result.estimatedHours, 7.42);
  assert.equal(Number(result.estimatedPct.toFixed(1)), 65.3);
});
test('KORD October 10 gives 11.32 hours rather than whole-bucket 13 hours', () => {
  const next = { ...day, local_date: '2026-10-10', sunrise: '2026-10-10T06:58:52.452768-05:00', sunset: '2026-10-10T18:17:46.626996-05:00' };
  const rows = Array.from({ length: 24 }, (_, hour) => ({ ...row(hour), ts_local: row(hour).ts_local.replace(date, next.local_date) }));
  near(historicalSunshine(rows, next).estimatedHours, 11.32);
});
test('station-local conversions are independent of browser timezone', () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ['Asia/Tokyo', 'America/New_York', 'America/Los_Angeles']) {
      process.env.TZ = timezone;
      assert.equal(historicalSunshine([row(12)], day).estimatedHours, 1);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
