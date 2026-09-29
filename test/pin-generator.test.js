const test = require('node:test');
const assert = require('node:assert/strict');

const PINGenerator = require('../src/utils/pin-generator');

test('generates exactly 4 digits', () => {
  for (let i = 0; i < 500; i += 1) {
    assert.match(PINGenerator(), /^\d{4}$/);
  }
});

test('preserves leading zeros instead of returning a shorter number', () => {
  const generated = Array.from({ length: 2000 }, () => PINGenerator());

  assert.ok(
    generated.some((pin) => pin.startsWith('0')),
    'expected at least one PIN below 1000 across 2000 draws'
  );
  for (const pin of generated) {
    assert.equal(pin.length, 4);
  }
});

test('is uniformly distributed across all 10,000 values', () => {
  // Distribution of the leading digit over 20,000 draws should be flat. A truly
  // uniform generator has a standard deviation of ~42 here, so a bucket below
  // 1,700 or above 2,300 is roughly 7 standard deviations out and would mean a
  // real bias rather than noise.
  const buckets = new Array(10).fill(0);
  const draws = 20000;

  for (let i = 0; i < draws; i += 1) {
    buckets[Number(PINGenerator()[0])] += 1;
  }

  const expected = draws / 10;
  for (const [digit, count] of buckets.entries()) {
    assert.ok(
      count > expected - 300 && count < expected + 300,
      `leading digit ${digit} appeared ${count} times, expected ~${expected}`
    );
  }
});

test('reaches both ends of the 0000-9999 range', () => {
  const generated = Array.from({ length: 5000 }, () => Number(PINGenerator()));

  assert.ok(Math.min(...generated) < 50, 'expected very low PINs');
  assert.ok(Math.max(...generated) > 9950, 'expected very high PINs');
});
