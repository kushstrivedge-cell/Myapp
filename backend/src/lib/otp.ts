import {createHmac, randomInt, timingSafeEqual} from 'node:crypto';
import {env} from '../config/env.js';

export const createOtp = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
export const hashOtp = (code: string) => createHmac('sha256', env.OTP_SECRET).update(code).digest('hex');
export const otpMatches = (code: string, hash: string) => {
  const actual = Buffer.from(hashOtp(code));
  const expected = Buffer.from(hash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
