export class AppError extends Error {
  declare code: number | undefined;
  /**
   * Additional error details for debugging.
   * May be sent to error reporting service.
   */
  declare details: unknown;
  declare timestamp: string;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);

    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Error.captureStackTrace?.(this, this.constructor);
  }
}
