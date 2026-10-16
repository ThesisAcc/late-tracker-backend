const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcrypt');

const repositoryPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'auth.repository.js');
const authServicePath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'auth.service.js');

function loadServiceWithStub(stub) {
  delete require.cache[authServicePath];
  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: stub,
  };
  return require(authServicePath);
}

test('changePassword throws 404 when user not found or disabled', async () => {
  const service = loadServiceWithStub({
    findUserById: async () => null,
  });

  await assert.rejects(
    () => service.changePassword('user-1', { currentPin: '1234', newPin: '5678' }),
    { statusCode: 404, message: 'User not found or account is disabled' }
  );

  const disabledService = loadServiceWithStub({
    findUserById: async () => ({ id: 'user-1', status: 'DISABLED' }),
  });

  await assert.rejects(
    () => disabledService.changePassword('user-1', { currentPin: '1234', newPin: '5678' }),
    { statusCode: 404, message: 'User not found or account is disabled' }
  );
});

test('changePassword throws 400 when current PIN does not match', async () => {
  const currentHash = await bcrypt.hash('1234', 10);
  const service = loadServiceWithStub({
    findUserById: async () => ({ id: 'user-1', status: 'ACTIVE', passwordHash: currentHash }),
  });

  await assert.rejects(
    () => service.changePassword('user-1', { currentPin: '9999', newPin: '5678' }),
    { statusCode: 400, message: 'Current PIN is incorrect' }
  );
});

test('changePassword updates password hash and succeeds on valid PIN', async () => {
  const currentHash = await bcrypt.hash('1234', 10);
  let updatedId = null;
  let updatedHash = null;

  const service = loadServiceWithStub({
    findUserById: async () => ({ id: 'user-1', status: 'ACTIVE', passwordHash: currentHash }),
    updatePasswordHash: async (id, hash) => {
      updatedId = id;
      updatedHash = hash;
      return { id };
    },
  });

  const result = await service.changePassword('user-1', { currentPin: '1234', newPin: '5678' });
  assert.equal(updatedId, 'user-1');
  assert.ok(updatedHash);
  assert.equal(await bcrypt.compare('5678', updatedHash), true);
  assert.equal(result.message, 'Password changed successfully');
});
