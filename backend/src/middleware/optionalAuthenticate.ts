import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/tokens.js';
import { AppError } from '../lib/errors.js';

export const optionalAuthenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme === 'Bearer' && token) {
    try {
      const payload = await verifyAccessToken(token);
      request.auth = { userId: payload.sub!, role: String(payload.role) };
    } catch {
      throw new AppError(
        401,
        'Access token is invalid or expired',
        'INVALID_TOKEN',
      );
    }
  }
  next();
};
