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

assert.equal(fs.existsSync(path.join(root, 'src/server/middleware/utils/authUtils.ts')), false, 'placeholder token verifier must not exist');

for (const [name, source] of [
  ['auth.routes.ts', authRoutes],
  ['authStore.ts', authStore],
  ['pnbox-connection.routes.ts', connectionRoutes],
]) {
  assert.equal(source.includes('LOCAL_USERS'), false, `${name}: local user store must not exist`);
  assert.equal(source.includes('local_token_'), false, `${name}: local token path must not exist`);
}

assert.equal(authRoutes.includes('Math.random('), false, 'auth routes must not fabricate user IDs');
assert.equal(authRoutes.includes('passwordHash'), false, 'auth routes must not store plaintext passwords');
assert.equal(authStore.includes('default-pnbox-key-fallback'), false, 'encryption fallback key must not exist');
assert.equal(authStore.includes('if (!ENCRYPTION_KEY) return plaintext'), false, 'plaintext encryption fallback must not exist');
assert.equal(authStore.includes('if (!ENCRYPTION_KEY) return encrypted'), false, 'plaintext decryption fallback must not exist');
assert.equal(connectionRoutes.includes('LOCAL_CREDENTIALS'), false, 'PNBOX credentials must not be kept in memory as a local fallback');

console.log('securityP0: all static authentication/credential invariants passed');
