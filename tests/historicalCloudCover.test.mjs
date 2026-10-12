import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimatedCloudCover, historicalCloudSummary } from '../src/utils/historicalCloudCover.ts';

const rows = codes => codes.map(skyc1 => ({ skyc1 }));

test('sky category estimates match the existing mapping', () => {
  for (const [code, expected] of Object.entries({ CLR: 0, SKC: 0, FEW: 18, SCT: 44, BKN: 75, OVC: 100 })) {
    assert.equal(estimatedCloudCover(code), expected);
    assert.equal(estimatedCloudCover(code.toLowerCase()), expected);
  }
});
test('missing and unknown codes stay missing', () => {
  for (const code of [null, '', 'VV', 'UNKNOWN']) assert.equal(estimatedCloudCover(code), null);
});
test('missing sky does not become 50 percent or clear skies', () => {
  const result = historicalCloudSummary(rows(['OVC', null, 'UNKNOWN', 'CLR']));
  assert.equal(result.avgCloudCover, 50);
  assert.equal(result.observedCount, 2);
  assert.equal(result.clearHours, 1);
  assert.equal(result.overcastHours, 1);
});
test('all missing records and empty days have no average', () => {
  assert.equal(historicalCloudSummary(rows([null, 'VV'])).avgCloudCover, null);
  assert.equal(historicalCloudSummary([]).avgCloudCover, null);
});
test('original breakdown thresholds are preserved for known codes', () => {
  const result = historicalCloudSummary(rows(['CLR', 'FEW', 'SCT', 'BKN', 'OVC', null]));
  assert.deepEqual([result.clearHours, result.cloudyHours, result.overcastHours], [2, 2, 1]);
});
test('KORD October 9 matches the daily statistic', () => {
  const result = historicalCloudSummary(rows([...Array(6).fill('BKN'), ...Array(7).fill('OVC'), ...Array(6).fill('CLR'), ...Array(3).fill('FEW'), ...Array(2).fill('SCT')]));
  assert.equal(result.avgCloudCover, 53.8);
});
test('KORD October 10 matches Python half-even rounding', () => {
  assert.equal(historicalCloudSummary(rows([...Array(2).fill('BKN'), ...Array(22).fill('CLR')])).avgCloudCover, 6.2);
});
test('non-exact decimal ties follow the binary average used by Python', () => {
  assert.equal(historicalCloudSummary(rows([...Array(11).fill('BKN'), ...Array(3).fill('FEW'), 'SCT', ...Array(5).fill('CLR')])).avgCloudCover, 46.1);
});
