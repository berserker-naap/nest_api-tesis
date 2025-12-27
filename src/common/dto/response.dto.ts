// src/common/dto/response.dto.ts
export class StatusResponse<T> {
    ok: boolean;
    statusCode: number;
    message: string | string[];
    data?: T;
  
    constructor(ok: boolean, status: number, message: string | string[], data?: T) {
      this.ok = ok;
      this.statusCode = status;
      this.message = message;
      this.data = data;
    }
  }
  