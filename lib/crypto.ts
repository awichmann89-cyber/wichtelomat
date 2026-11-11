import {
  randomBytes,
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  scrypt as scryptCb,
  timingSafeEqual,
  randomInt,
} from 'node:crypto';
import { appSecret } from './env';

const SCRYPT = { N: 16384, r: 8, p: 1 };

function scrypt(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(pw, salt, 32, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, h] = stored.split('$');
  if (alg !== 'scrypt' || !s || !h) return false;
  const hash = await scrypt(pw, Buffer.from(s, 'base64url'));
  const expected = Buffer.from(h, 'base64url');
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

export function hmac(data: string): string {
  return createHmac('sha256', appSecret()).update(data).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

function encKey(): Buffer {
  return createHash('sha256').update(`enc:${appSecret()}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(enc: string): string {
  const [iv, tag, data] = enc.split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function randomSlug(len = 10): string {
  let s = '';
  for (let i = 0; i < len; i++) s += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return s;
}

export function randomCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
