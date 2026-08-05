import {createHash, randomUUID} from 'node:crypto';
import {jwtVerify, SignJWT} from 'jose';
import {env} from '../config/env.js';

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.JWT_ACCESS_SECRET);
const refreshSecret = encoder.encode(env.JWT_REFRESH_SECRET);
const issuer = 'cartly-api';
const audience = 'cartly-mobile';

export async function createAccessToken(userId: string, role: string) {
  return new SignJWT({role, type: 'access'}).setProtectedHeader({alg: 'HS256'}).setSubject(userId).setIssuer(issuer).setAudience(audience).setJti(randomUUID()).setIssuedAt().setExpirationTime(env.ACCESS_TOKEN_TTL).sign(accessSecret);
}

export async function createRefreshToken(userId: string) {
  return new SignJWT({type: 'refresh'}).setProtectedHeader({alg: 'HS256'}).setSubject(userId).setIssuer(issuer).setAudience(audience).setJti(randomUUID()).setIssuedAt().setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`).sign(refreshSecret);
}

export async function verifyAccessToken(token: string) {
  const {payload} = await jwtVerify(token, accessSecret, {issuer, audience});
  if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid access token');
  return payload;
}

export async function verifyRefreshToken(token: string) {
  const {payload} = await jwtVerify(token, refreshSecret, {issuer, audience});
  if (payload.type !== 'refresh' || !payload.sub) throw new Error('Invalid refresh token');
  return payload;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
