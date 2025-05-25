// src/common/decorators/client-ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const forwarded = request.headers['x-forwarded-for'];
    return (
      (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ||
      request.connection?.remoteAddress ||
      request.ip
    );
  },
);
