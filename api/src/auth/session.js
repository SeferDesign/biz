import { createCipheriv, createDecipheriv, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function createSessionToken(user, secret, now = Date.now()) {
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({
    sub: Number(user.id),
    email: user.email,
    first_name: typeof user.first_name === 'string' ? user.first_name : '',
    last_name: typeof user.last_name === 'string' ? user.last_name : '',
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string' || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(session.sub) || session.sub < 1 || !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000)) return null;
    return {
      id: session.sub,
      email: session.email,
      first_name: typeof session.first_name === 'string' ? session.first_name : '',
      last_name: typeof session.last_name === 'string' ? session.last_name : ''
    };
  } catch {
    return null;
  }
}

function decodeRailsBase64(value) {
  if (!value) return null;
  return Buffer.from(Buffer.isBuffer(value) ? value.toString('utf8') : value, 'base64');
}

function encodeBase32(value) {
  let bits = 0;
  let accumulator = 0;
  let result = '';
  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Alphabet[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += base32Alphabet[(accumulator << (5 - bits)) & 31];
  return result;
}

export function generateOtpSecret() {
  return encodeBase32(randomBytes(20));
}

export function encryptOtpSecretForStorage(secret, encryptionKey) {
  if (!encryptionKey) throw new Error('OTP secret encryption is not configured');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(encryptionKey, salt, 2000, 32, 'sha1');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return {
    encrypted_otp_secret: encrypted.toString('base64'),
    encrypted_otp_secret_iv: iv.toString('base64'),
    encrypted_otp_secret_salt: salt.toString('base64')
  };
}

function decryptOtpSecret(user, encryptionKey) {
  if (!encryptionKey) return null;
  try {
    const iv = decodeRailsBase64(user.encrypted_otp_secret_iv);
    const salt = decodeRailsBase64(user.encrypted_otp_secret_salt);
    const encrypted = decodeRailsBase64(user.encrypted_otp_secret);
    if (!iv || !salt || !encrypted || encrypted.length <= 16) return null;

    const key = pbkdf2Sync(encryptionKey, salt, 2000, 32, 'sha1');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(encrypted.subarray(-16));
    return Buffer.concat([
      decipher.update(encrypted.subarray(0, -16)),
      decipher.final()
    ]).toString('utf8');
  } catch {
    return null;
  }
}

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value.toUpperCase().replace(/[=\s]/g, '');
  let bits = '';
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) return null;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret, timestamp = Date.now()) {
  const key = decodeBase32(secret);
  if (!key) return null;
  const timestep = Math.floor(timestamp / 30_000);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timestep));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}

function safeStringMatch(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isOtpEnabled(user) {
  return user.otp_required_for_login === true || user.otp_required_for_login === 1 || user.otp_required_for_login === '1';
}

export function validOtpTimestep(user, otpAttempt, encryptionKey, now = Date.now()) {
  const code = typeof otpAttempt === 'string' ? otpAttempt.replace(/\s+/g, '') : '';
  if (!/^\d{6}$/.test(code)) return null;
  const secret = decryptOtpSecret(user, encryptionKey);
  if (!secret) return null;

  const currentTimestep = Math.floor(now / 30_000);
  if (Number(user.consumed_timestep) === currentTimestep) return null;
  const valid = [-1, 0, 1].some((offset) => {
    const expected = generateTotpCode(secret, (currentTimestep + offset) * 30_000);
    return expected && safeStringMatch(expected, code);
  });
  return valid ? currentTimestep : null;
}

export async function verifyAndConsumeOtp(user, otpAttempt, store, encryptionKey, now = Date.now()) {
  if (!isOtpEnabled(user)) return true;
  const timestep = validOtpTimestep(user, otpAttempt, encryptionKey, now);
  return timestep !== null && store.consumeUserOtp(user.id, timestep);
}
