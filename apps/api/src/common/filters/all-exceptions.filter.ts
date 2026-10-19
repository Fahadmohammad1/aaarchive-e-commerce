import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Response } from "express";

// One error shape for every failure, which the frontend's ApiError parses:
// { statusCode, message, code?, details? }. Unexpected errors are logged in
// full and returned as a bare 500 so internals never reach the client.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === "string" ? { message: body } : (body as object);
      const { message, code, details } = payload as {
        message?: unknown;
        code?: string;
        details?: unknown;
      };
      res.status(statusCode).json({
        statusCode,
        message: message ?? exception.message,
        ...(code && { code }),
        ...(details !== undefined && { details }),
      });
      return;
    }

    this.logger.error(exception);
    // No-op unless SENTRY_DSN is set (src/instrument.ts).
    Sentry.captureException(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
