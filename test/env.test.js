const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const cors = require('cors');

const ENV_MODULE = path.join(__dirname, '..', 'src', 'config', 'env.js');

// env.js reads config once at require time, so each case is loaded in a child
// process. The child's cwd is the OS temp dir so dotenv finds no .env file and
// cannot re-inject CORS_ORIGIN behind the test's back. An override of null
// removes a variable entirely.
function loadEnv(overrides = {}) {
  const env = {
    ...process.env,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
    JWT_SECRET: 'test-secret',
  };
  delete env.CORS_ORIGIN;
  delete env.NODE_ENV;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete env[key];
    else env[key] = value;
  }

  const script = `process.stdout.write(JSON.stringify(require(${JSON.stringify(ENV_MODULE)})))`;

  return JSON.parse(
    execFileSync(process.execPath, ['-e', script], { cwd: os.tmpdir(), env, encoding: 'utf8' })
  );
}

function loadEnvExpectingThrow(overrides) {
  try {
    loadEnv(overrides);
  } catch (err) {
    return String(err.stderr || err.message);
  }
  return assert.fail('expected env.js to throw');
}

function allowOriginHeader(corsOrigin, requestOrigin = 'http://localhost:5173') {
  const headers = {};
  const res = {
    getHeader: (key) => headers[key],
    setHeader(key, value) {
      headers[key] = value;
    },
    removeHeader(key) {
      delete headers[key];
    },
    end() {},
  };

  cors({ origin: corsOrigin })({ headers: { origin: requestOrigin }, method: 'GET' }, res, () => {});

  return headers['Access-Control-Allow-Origin'];
}

test('an unset CORS_ORIGIN yields the string "*", not ["*"]', () => {
  // cors() treats an array as a literal allowlist, so ["*"] matches no origin
  // at all and silently blocks every browser request.
  assert.equal(loadEnv().corsOrigin, '*');
});

test('the "*" default really does allow a browser origin', () => {
  assert.equal(allowOriginHeader(loadEnv().corsOrigin), '*');
});

test('a single CORS_ORIGIN becomes a one element array', () => {
  assert.deepEqual(loadEnv({ CORS_ORIGIN: 'https://app.example.com' }).corsOrigin, [
    'https://app.example.com',
  ]);
});

test('a comma separated list is split and trimmed', () => {
  const env = loadEnv({ CORS_ORIGIN: ' https://a.example.com , https://b.example.com ' });

  assert.deepEqual(env.corsOrigin, ['https://a.example.com', 'https://b.example.com']);
});

test('a configured list allows its own origins and rejects others', () => {
  const { corsOrigin } = loadEnv({
    CORS_ORIGIN: 'https://a.example.com,https://b.example.com',
  });

  assert.equal(allowOriginHeader(corsOrigin, 'https://a.example.com'), 'https://a.example.com');
  assert.equal(allowOriginHeader(corsOrigin, 'https://b.example.com'), 'https://b.example.com');
  assert.equal(allowOriginHeader(corsOrigin, 'https://evil.example.com'), undefined);
});

test('an empty CORS_ORIGIN falls back to "*" rather than [""]', () => {
  const env = loadEnv({ CORS_ORIGIN: '' });

  assert.equal(env.corsOrigin, '*');
  assert.equal(allowOriginHeader(env.corsOrigin), '*');
});

test('a missing CORS_ORIGIN is fatal in production', () => {
  const stderr = loadEnvExpectingThrow({ NODE_ENV: 'production' });

  assert.match(stderr, /CORS_ORIGIN/);
});

test('a present CORS_ORIGIN keeps production working', () => {
  const env = loadEnv({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://app.example.com',
  });

  assert.deepEqual(env.corsOrigin, ['https://app.example.com']);
});

test('a missing DATABASE_URL is fatal in every environment', () => {
  assert.match(loadEnvExpectingThrow({ DATABASE_URL: null }), /DATABASE_URL/);
  assert.match(loadEnvExpectingThrow({ DATABASE_URL: null, NODE_ENV: 'production' }), /DATABASE_URL/);
});

test('a missing JWT_SECRET is fatal', () => {
  assert.match(loadEnvExpectingThrow({ JWT_SECRET: null }), /JWT_SECRET/);
});

test('jwtExpiresIn defaults to 8h and is overridable', () => {
  assert.equal(loadEnv().jwtExpiresIn, '8h');
  assert.equal(loadEnv({ JWT_EXPIRES_IN: '1h' }).jwtExpiresIn, '1h');
});
