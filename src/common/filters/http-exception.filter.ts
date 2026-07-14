import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StatusResponse } from '../dto/response.dto';
import { ServiceErrorLogService } from '../services/service-error-log.service';
import {
  isErrorAlreadyLogged,
  markErrorAsLogged,
} from '../utils/service-error-log.util';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly serviceErrorLogService: ServiceErrorLogService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let detail: string | null = null;

    if (exception instanceof BadRequestException) {
      const res = exception.getResponse();
      status = exception.getStatus();
      message = (res as { message?: string | string[] })?.message ?? 'Datos invalidos';
      detail = this.toDetailString(res);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message || 'Error HTTP';
      detail = this.toDetailString(exception.getResponse());
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    if (this.shouldLogException(request, exception)) {
      await this.serviceErrorLogService.log({
        sourceType: 'HTTP_EXCEPTION',
        statusCode: status,
        message,
        detail,
        error: exception,
        route: request?.originalUrl ?? request?.url,
        httpMethod: request?.method,
      });
      markErrorAsLogged(exception);
    }

    const result = new StatusResponse(false, status, message, null);
    response.status(status).json(result);
  }

  private shouldLogException(
    request: Request | undefined,
    exception: unknown,
  ): boolean {
    const route = `${request?.originalUrl ?? request?.url ?? ''}`.toLowerCase();
    if (route.includes('/integrations/whatsapp')) {
      return false;
    }

    return !isErrorAlreadyLogged(exception);
  }

  private toDetailString(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    try {
      const json = JSON.stringify(value);
      return json.length > 2000 ? json.slice(0, 2000) : json;
    } catch {
      const text = String(value);
      return text.length > 2000 ? text.slice(0, 2000) : text;
    }
  }
}
