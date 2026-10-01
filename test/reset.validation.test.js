const test = require('node:test');
const assert = require('node:assert/strict');

const { resetConfirmSchema } = require('../src/modules/reset/reset.validation');

test('resetConfirmSchema accepts the exact confirmation token', () => {
  assert.deepEqual(resetConfirmSchema.parse({ confirm: 'RESET_NON_ADMIN_DATA' }), {
    confirm: 'RESET_NON_ADMIN_DATA',
  });
});

test('resetConfirmSchema rejects any other confirmation token', () => {
  assert.throws(() => {
    resetConfirmSchema.parse({ confirm: 'RESET_ALL_DATA' });
  });
});