import { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export function authorize(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      throw new AppError(401, 'Authentication is required', 'UNAUTHENTICATED');
    }
    if (!roles.includes(request.auth.role)) {
      throw new AppError(
        403,
        'You do not have permission to perform this action',
        'FORBIDDEN',
      );
    }
    next();
  };
}
