import {RequestHandler} from 'express';
import {AppError} from '../lib/errors.js';
import {verifyAccessToken} from '../lib/tokens.js';

export const authenticate: RequestHandler = async (request, _response, next) => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Authentication is required', 'UNAUTHENTICATED');
  try {
    const payload = await verifyAccessToken(token);
    request.auth = {userId: payload.sub!, role: String(payload.role)};
    next();
  } catch {
    throw new AppError(401, 'Access token is invalid or expired', 'INVALID_TOKEN');
  }
};
