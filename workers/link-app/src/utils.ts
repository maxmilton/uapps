export class AppError extends Error {
  declare code: number | undefined;
  /**
   * Additional error details for debugging.
   * May be sent to error reporting service.
   */
  declare details: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);

    this.name = "AppError";
    this.code = code;
    this.details = details;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    Error.captureStackTrace?.(this, this.constructor);
  }
}
