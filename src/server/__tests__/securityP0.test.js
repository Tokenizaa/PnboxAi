import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const authRoutes = read('src/server/routes/auth.routes.ts');
const authStore = read('src/server/services/authStore.ts');
const connectionRoutes = read('src/server/routes/pnbox-connection.routes.ts');
const plansRoutes = read('src/server/routes/plans.routes.ts');
const automationAuth = read('src/automation/auth.ts');

assert.equal(fs.existsSync(path.join(root, 'src/server/middleware/utils/authUtils.ts')), false, 'placeholder token verifier must not exist');

for (const [name, source] of [
  ['auth.routes.ts', authRoutes],
  ['authStore.ts', authStore],
  ['pnbox-connection.routes.ts', connectionRoutes],
  ['plans.routes.ts', plansRoutes],
]) {
  assert.equal(source.includes('LOCAL_USERS'), false, `${name}: local user store must not exist`);
  assert.equal(source.includes('local_token_'), false, `${name}: local token path must not exist`);
}

assert.equal(authRoutes.includes('Math.random('), false, 'auth routes must not fabricate user IDs');
assert.equal(authRoutes.includes('passwordHash'), false, 'auth routes must not store plaintext passwords');
assert.equal(authRoutes.includes("client.auth.signOut()"), true, 'logout must revoke the authenticated Supabase session');
assert.equal(authStore.includes('default-pnbox-key-fallback'), false, 'encryption fallback key must not exist');
assert.equal(authStore.includes('if (!ENCRYPTION_KEY) return plaintext'), false, 'plaintext encryption fallback must not exist');
assert.equal(authStore.includes('if (!ENCRYPTION_KEY) return encrypted'), false, 'plaintext decryption fallback must not exist');
assert.equal(connectionRoutes.includes('LOCAL_CREDENTIALS'), false, 'PNBOX credentials must not be kept in memory as a local fallback');

// Session expiration is enforced by the actual timestamp gate, not a synthetic expiration switch.
assert.match(automationAuth, /new Date\(sessao\.expiraEm\)\.getTime\(\) <= Date\.now\(\)/, 'expired PNBOX sessions must be rejected by timestamp');
assert.equal(automationAuth.includes('simularExpiracaoSessao'), false, 'synthetic session-expiration helper must not exist');

// Every plan operation must authenticate first and validate ownership before remote access.
for (const route of [
  "'/plans/:id/pull-all'",
  "'/plans/:id/push-all'",
  "'/plans/:id/tools/:ferramentaId'",
  "'/plans/:id/tools/:ferramentaId/item'",
  "'/plans/:id/sync-bidirectional'",
  "'/plans/:id/stream'",
]) {
  const index = plansRoutes.indexOf(route);
  assert.notEqual(index, -1, `expected protected route ${route}`);
  const nextChunk = plansRoutes.slice(index, index + 5000);
  assert.match(nextChunk, /authMiddleware/, `${route}: authentication middleware is required`);
  assert.match(nextChunk, /requireUserOwnsPlan/, `${route}: plan ownership check is required`);
}

assert.match(plansRoutes, /PNBOX_REAL_PLAN_REQUIRED/, 'synthetic plan identifiers must be rejected');
assert.match(plansRoutes, /FORBIDDEN_PLAN_ACCESS/, 'cross-user plan access must be rejected');

console.log('securityP0: authentication, revocation, expiration, synthetic-token, and plan-isolation invariants passed');
