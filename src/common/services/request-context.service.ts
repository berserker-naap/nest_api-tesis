import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { Request } from 'express';

type RequestContextStore = {
  request: Request;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  runWithRequest<T>(request: Request, callback: () => T): T {
    return this.storage.run({ request }, callback);
  }

  getRequest(): Request | null {
    return this.storage.getStore()?.request ?? null;
  }
}
