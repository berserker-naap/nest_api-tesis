// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StatusResponseDto } from '../dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';

    if (exception instanceof BadRequestException) {
      const res: any = exception.getResponse();
      status = exception.getStatus();
      message = res?.message || 'Datos inválidos';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message || 'Error HTTP';
    }

    const result = new StatusResponseDto(false, status, message , null);
    response.status(status).json(result);
  }
}
