import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historicalPrecipitation } from '../src/utils/historicalPrecipitation.ts';

const rows = values => values.map((precip_in, hour) => ({
  ts_local: `2026-10-09T${String(hour).padStart(2, '0')}:00:00`, precip_in,
}));

test('measured zero remains zero', () => {
  const result = historicalPrecipitation(rows([0, 0]));
  assert.equal(result.total, 0);
  assert.deepEqual(result.values, [0, 0]);
  assert.deepEqual(result.cumulative, [0, 0]);
});

test('Trace remains separate from measurable precipitation', () => {
  const result = historicalPrecipitation(rows([0, 0.0001, 0]));
  assert.deepEqual(result.traces, [false, true, false]);
  assert.deepEqual(result.values, [0, null, 0]);
  assert.equal(result.total, 0);
});

test('mixed measured rain and Trace excludes sentinel amounts', () => {
  const result = historicalPrecipitation(rows([0.01, 0.0001, 0.02]));
  assert.equal(result.total, 0.03);
  assert.deepEqual(result.cumulative, [0.01, 0.01, 0.03]);
});

test('missing readings do not become zero or a known cumulative total', () => {
  const result = historicalPrecipitation(rows([0.01, null, 0.02]));
  assert.deepEqual(result.values, [0.01, null, 0.02]);
  assert.deepEqual(result.cumulative, [0.01, null, null]);
  assert.equal(result.observedCount, 2);
});

test('all missing readings and empty days have no measured total', () => {
  assert.equal(historicalPrecipitation(rows([null, null])).total, null);
  assert.equal(historicalPrecipitation([]).total, null);
});

test('unrecorded hourly gaps make later cumulative amounts unknown', () => {
  const data = rows([0.01, 0.02, 0.03]);
  data.splice(1, 1);
  assert.deepEqual(historicalPrecipitation(data).cumulative, [0.01, null]);
});

test('a partial day starting after midnight has no full-day cumulative amount', () => {
  assert.deepEqual(historicalPrecipitation(rows([0, 0.02]).slice(1)).cumulative, [null]);
});

test('station-local buckets are independent of browser/process timezone', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['America/New_York', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.deepEqual(historicalPrecipitation(rows([0.01, 0.02])).cumulative, [0.01, 0.03]);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
