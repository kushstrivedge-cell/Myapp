import {randomBytes, scrypt as nodeScrypt, timingSafeEqual} from 'node:crypto';
const N = 131_072;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

const deriveKey = (password: string, salt: Buffer, length: number, options: {N: number; r: number; p: number; maxmem: number}) =>
  new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, {
    N, r: R, p: P, maxmem: MAX_MEMORY,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, n, r, p, saltValue, keyValue] = stored.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltValue || !keyValue) return false;
  const expected = Buffer.from(keyValue, 'base64');
  const actual = await deriveKey(password, Buffer.from(saltValue, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
