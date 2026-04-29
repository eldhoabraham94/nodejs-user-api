import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

interface JsonApiError {
  status: string;
  title: string;
  detail: string;
  source?: { pointer: string };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof BadRequestException) {
      const body = exception.getResponse() as { message: unknown };
      const messages = body.message;

      if (Array.isArray(messages)) {
        const errors = this.flattenValidationErrors(messages as ValidationError[]);
        if (errors.length > 0) {
          response
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .set('Content-Type', 'application/vnd.api+json')
            .json({ errors });
          return;
        }
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as { message?: string } | string;
      const detail = typeof body === 'string' ? body : (body.message ?? exception.message);

      response
        .status(status)
        .set('Content-Type', 'application/vnd.api+json')
        .json({
          errors: [
            {
              status: String(status),
              title: exception.name.replace('Exception', ''),
              detail,
            },
          ],
        });
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .set('Content-Type', 'application/vnd.api+json')
      .json({
        errors: [{ status: '500', title: 'Internal Server Error', detail: 'An unexpected error occurred' }],
      });
  }

  private flattenValidationErrors(
    errors: ValidationError[],
    path = '',
  ): JsonApiError[] {
    const result: JsonApiError[] = [];

    for (const error of errors) {
      const currentPath = path ? `${path}.${error.property}` : error.property;

      if (error.constraints) {
        for (const detail of Object.values(error.constraints)) {
          const pointer = this.pathToPointer(currentPath);
          result.push({
            status: '422',
            title: 'Validation Error',
            detail,
            source: { pointer },
          });
        }
      }

      if (error.children && error.children.length > 0) {
        result.push(...this.flattenValidationErrors(error.children, currentPath));
      }
    }

    return result;
  }

  private pathToPointer(dotPath: string): string {
    // "data.attributes.email" → "/data/attributes/email"
    // Strip leading "data.attributes." part and remap to JSON:API pointer format
    const parts = dotPath.split('.');
    const attrIndex = parts.indexOf('attributes');
    if (attrIndex !== -1) {
      const field = parts.slice(attrIndex + 1).join('.');
      return `/data/attributes/${field}`;
    }
    return '/' + parts.join('/');
  }
}
