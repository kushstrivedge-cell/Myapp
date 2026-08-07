import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../lib/errors.js';

export const notFound: RequestHandler = (request, response) => {
  response
    .status(404)
    .json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.path} was not found`,
      },
    });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof multer.MulterError) {
    response
      .status(400)
      .json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Image must be 5 MB or smaller'
              : error.message,
        },
      });
    return;
  }
  if (error instanceof ZodError) {
    response
      .status(400)
      .json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          fields: error.flatten().fieldErrors,
        },
      });
    return;
  }
  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
};
