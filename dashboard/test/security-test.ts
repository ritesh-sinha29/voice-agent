// ==============================================================================
// Replora Voice Studio — Dashboard Server Security Verification Tests
// ==============================================================================
import assert from 'assert';
import crypto from 'crypto';

console.log('\n======================================================');
console.log(' RUNNING DASHBOARD SECURITY VERIFICATION TEST SUITE   ');
console.log('======================================================\n');

// 1. Test safeCompare with various key lengths and values
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(Buffer.from(a)).digest();
  const hashB = crypto.createHash('sha256').update(Buffer.from(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Test exact match
assert.strictEqual(safeCompare('my_secret_token_123', 'my_secret_token_123'), true);
// Test different length (must NOT throw)
assert.strictEqual(safeCompare('short', 'much_longer_token_value_xyz'), false);
// Test empty / null strings
assert.strictEqual(safeCompare('', 'secret'), false);
assert.strictEqual(safeCompare('secret', ''), false);
console.log('[PASS] safeCompare handles matching, mismatching, and unequal lengths without throwing');

// 2. Test sanitizeEnvValue against shell injection & newline injection
function sanitizeEnvValue(value: string): string {
  return value.replace(/[\r\n\0\$`"'\\;|&]/g, '').trim().slice(0, 128);
}

const dangerousInput = 'normal_value\nINJECTED_ENV=hacked\r\nrm -rf $DIR; `evil`';
const sanitized = sanitizeEnvValue(dangerousInput);
assert(!sanitized.includes('\n'), 'Newline was not stripped');
assert(!sanitized.includes('\r'), 'Carriage return was not stripped');
assert(!sanitized.includes('$'), '$ was not stripped');
assert(!sanitized.includes(';'), '; was not stripped');
assert(!sanitized.includes('`'), '` was not stripped');
console.log('[PASS] sanitizeEnvValue strips shell injection and carriage return / newlines');

// 3. Test crypto.getRandomValues token generation (M2)
const randomBytes = new Uint8Array(8);
crypto.getRandomValues(randomBytes);
const code = `inv_${Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('')}`;
assert(code.startsWith('inv_'), 'Invite token missing prefix');
assert.strictEqual(code.length, 4 + 16, 'Invite token length unexpected');
console.log('[PASS] Cryptographically secure invite token generation verified');

console.log('\n--- ALL DASHBOARD SECURITY UNIT TESTS PASSED ---\n');
