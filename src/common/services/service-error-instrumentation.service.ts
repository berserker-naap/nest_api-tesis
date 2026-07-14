import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { StatusResponse } from '../dto/response.dto';
import {
  isErrorAlreadyLogged,
  markErrorAsLogged,
} from '../utils/service-error-log.util';
import { ServiceErrorLogService } from './service-error-log.service';

@Injectable()
export class ServiceErrorInstrumentationService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly serviceErrorLogService: ServiceErrorLogService,
  ) {}

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance as Record<string, unknown> | undefined;
      const metatype = wrapper.metatype as { name?: string } | undefined;
      const serviceName = metatype?.name?.trim() || '';

      if (!instance || !serviceName || !this.shouldWrap(serviceName)) {
        continue;
      }

      const moduleName = this.resolveModuleName(wrapper);
      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) {
        continue;
      }

      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        if (methodName === 'constructor') {
          continue;
        }

        const original = instance[methodName];
        if (typeof original !== 'function') {
          continue;
        }

        const wrappedFn = original as ((...args: unknown[]) => unknown) & {
          __errorLogWrapped?: boolean;
        };

        if (wrappedFn.__errorLogWrapped) {
          continue;
        }

        const instrumented = this.buildWrapper(
          wrappedFn,
          moduleName,
          serviceName,
          methodName,
        ) as typeof wrappedFn;
        instrumented.__errorLogWrapped = true;
        instance[methodName] = instrumented;
      }
    }
  }

  private buildWrapper(
    original: (...args: unknown[]) => unknown,
    moduleName: string | null,
    serviceName: string,
    methodName: string,
  ): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => {
      try {
        const result = original(...args);

        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>)
            .then(async (resolved) => {
              await this.logHandledFailure(
                resolved,
                moduleName,
                serviceName,
                methodName,
                args,
              );
              return resolved;
            })
            .catch(async (error) => {
              await this.logThrownError(
                error,
                moduleName,
                serviceName,
                methodName,
                args,
              );
              throw error;
            });
        }

        void this.logHandledFailure(
          result,
          moduleName,
          serviceName,
          methodName,
          args,
        );
        return result;
      } catch (error) {
        void this.logThrownError(
          error,
          moduleName,
          serviceName,
          methodName,
          args,
        );
        throw error;
      }
    };
  }

  private async logThrownError(
    error: unknown,
    moduleName: string | null,
    serviceName: string,
    methodName: string,
    args: unknown[],
  ): Promise<void> {
    if (isErrorAlreadyLogged(error)) {
      return;
    }

    await this.serviceErrorLogService.log({
      sourceType: 'SERVICE_EXCEPTION',
      moduleName,
      serviceName,
      methodName,
      error,
      payload: {
        args,
      },
    });

    markErrorAsLogged(error);
  }

  private async logHandledFailure(
    result: unknown,
    moduleName: string | null,
    serviceName: string,
    methodName: string,
    args: unknown[],
  ): Promise<void> {
    if (!this.isFailedStatusResponse(result)) {
      return;
    }

    await this.serviceErrorLogService.log({
      sourceType: 'SERVICE_RESULT',
      moduleName,
      serviceName,
      methodName,
      statusCode: result.statusCode,
      message: result.message,
      payload: {
        args,
        response: result,
      },
    });
  }

  private isFailedStatusResponse(value: unknown): value is StatusResponse<unknown> {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<StatusResponse<unknown>>;
    return (
      candidate.ok === false &&
      typeof candidate.statusCode === 'number' &&
      'message' in candidate
    );
  }

  private shouldWrap(serviceName: string): boolean {
    if (
      serviceName.includes('Whatsapp') ||
      serviceName === 'ServiceErrorLogService' ||
      serviceName === 'ServiceErrorInstrumentationService' ||
      serviceName === 'RequestContextService'
    ) {
      return false;
    }

    return serviceName.endsWith('Service') || serviceName.endsWith('Provider');
  }

  private resolveModuleName(wrapper: unknown): string | null {
    const host = (wrapper as { host?: { metatype?: { name?: string }; name?: string } })
      .host;

    const moduleName =
      host?.metatype?.name?.trim() || host?.name?.trim() || null;

    return moduleName && !moduleName.includes('[object') ? moduleName : null;
  }
}
