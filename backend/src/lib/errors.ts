export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'REQUEST_FAILED',
    public details?: unknown,
  ) {
    super(message);
  }
}
