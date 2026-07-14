import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { ServiceErrorLog } from '../entity/service-error-log.entity';
import { RequestContextService } from './request-context.service';

type ErrorSourceType = 'SERVICE_RESULT' | 'SERVICE_EXCEPTION' | 'HTTP_EXCEPTION';

export type ServiceErrorLogInput = {
  sourceType: ErrorSourceType;
  moduleName?: string | null;
  serviceName?: string | null;
  methodName?: string | null;
  statusCode?: number | null;
  message?: string | string[] | null;
  detail?: string | null;
  error?: unknown;
  payload?: unknown;
  route?: string | null;
  httpMethod?: string | null;
  idUsuario?: number | null;
  usuarioLogin?: string | null;
  ip?: string | null;
};

@Injectable()
export class ServiceErrorLogService {
  constructor(
    @InjectRepository(ServiceErrorLog)
    private readonly logRepository: Repository<ServiceErrorLog>,
    private readonly requestContextService: RequestContextService,
  ) {}

  async log(input: ServiceErrorLogInput): Promise<void> {
    try {
      const request = this.requestContextService.getRequest();
      if (this.shouldSkipRequest(request)) {
        return;
      }

      const auth = this.extractAuthContext(request);
      const errorMeta = this.extractErrorMeta(input.error);

      const entity = this.logRepository.create({
        sourceType: input.sourceType,
        moduleName: this.toNullableString(input.moduleName, 100),
        serviceName: this.toNullableString(input.serviceName, 120),
        methodName: this.toNullableString(input.methodName, 120),
        errorType: this.toNullableString(errorMeta.errorType, 120),
        statusCode:
          typeof input.statusCode === 'number' && Number.isFinite(input.statusCode)
            ? input.statusCode
            : null,
        message:
          this.toMessage(input.message ?? errorMeta.message) ??
          'Error interno del servicio',
        detail: this.toNullableString(input.detail ?? errorMeta.detail, 2000),
        stackTrace: this.toNullableString(errorMeta.stack, 3500),
        httpMethod: this.toNullableString(
          input.httpMethod ?? request?.method,
          20,
        ),
        route: this.toNullableString(
          input.route ?? request?.originalUrl ?? request?.url,
          350,
        ),
        idUsuario:
          typeof input.idUsuario === 'number' && Number.isFinite(input.idUsuario)
            ? input.idUsuario
            : auth.idUsuario,
        usuarioLogin:
          this.toNullableString(input.usuarioLogin, 100) ?? auth.usuarioLogin,
        payloadJson: this.toPayloadJson(input.payload, 3500),
        activo: true,
        eliminado: false,
        ipRegistro:
          this.toNullableString(input.ip, 50) ??
          this.toNullableString(this.extractIp(request), 50) ??
          undefined,
        usuarioRegistro:
          this.toNullableString(input.usuarioLogin, 100) ??
          auth.usuarioLogin ??
          'system',
      });

      await this.logRepository.save(entity);
    } catch (error) {
      console.error('Error registrando bitacora de servicios:', error);
    }
  }

  private shouldSkipRequest(request: Request | null): boolean {
    const route = `${request?.originalUrl ?? request?.url ?? ''}`.toLowerCase();
    return route.includes('/integrations/whatsapp');
  }

  private extractAuthContext(request: Request | null): {
    idUsuario: number | null;
    usuarioLogin: string | null;
  } {
    const requestWithUser = request as
      | (Request & {
          user?: {
            id?: unknown;
            idUsuario?: unknown;
            login?: unknown;
            usuarioLogin?: unknown;
          };
        })
      | null;

    const user = requestWithUser?.user as
      | {
          id?: unknown;
          idUsuario?: unknown;
          login?: unknown;
          usuarioLogin?: unknown;
        }
      | undefined;

    const idCandidate =
      typeof user?.id === 'number'
        ? user.id
        : typeof user?.idUsuario === 'number'
          ? user.idUsuario
          : null;

    const loginCandidate =
      this.toNullableString(user?.login, 100) ??
      this.toNullableString(user?.usuarioLogin, 100);

    return {
      idUsuario: idCandidate,
      usuarioLogin: loginCandidate,
    };
  }

  private extractIp(request: Request | null): string | null {
    if (!request) {
      return null;
    }

    const forwarded = request.headers['x-forwarded-for'];
    if (Array.isArray(forwarded) && forwarded[0]) {
      return String(forwarded[0]).trim();
    }
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() ?? null;
    }

    return request.ip || request.socket?.remoteAddress || null;
  }

  private extractErrorMeta(error: unknown): {
    errorType: string | null;
    message: string | null;
    detail: string | null;
    stack: string | null;
  } {
    if (!error) {
      return {
        errorType: null,
        message: null,
        detail: null,
        stack: null,
      };
    }

    if (error instanceof Error) {
      return {
        errorType: error.constructor?.name ?? 'Error',
        message: this.toNullableString(error.message, 1500),
        detail: null,
        stack: this.toNullableString(error.stack, 3500),
      };
    }

    return {
      errorType: typeof error,
      message: this.toNullableString(String(error), 1500),
      detail: null,
      stack: null,
    };
  }

  private toMessage(value: string | string[] | null | undefined): string | null {
    if (Array.isArray(value)) {
      return this.toNullableString(value.join(' | '), 1500);
    }

    return this.toNullableString(value, 1500);
  }

  private toPayloadJson(payload: unknown, maxLength: number): string | null {
    if (payload === undefined || payload === null) {
      return null;
    }

    try {
      return this.toNullableString(
        JSON.stringify(payload, this.jsonReplacer.bind(this)),
        maxLength,
      );
    } catch {
      return this.toNullableString(String(payload), maxLength);
    }
  }

  private jsonReplacer(key: string, value: unknown): unknown {
    const normalizedKey = key.trim().toLowerCase();
    if (
      normalizedKey.includes('password') ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('privatekey') ||
      normalizedKey.includes('accesskey')
    ) {
      return '[REDACTED]';
    }

    if (value instanceof Buffer) {
      return `[Buffer:${value.length}]`;
    }

    if (typeof value === 'string' && value.length > 500) {
      return `${value.slice(0, 500)}...[TRUNCATED]`;
    }

    return value;
  }

  private toNullableString(value: unknown, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    if (!text) {
      return null;
    }

    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }
}
