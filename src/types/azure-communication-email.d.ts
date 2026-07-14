declare module '@azure/communication-email' {
  export class EmailClient {
    constructor(connectionString: string);
    beginSend(message: unknown): Promise<{
      pollUntilDone(): Promise<{
        id?: string;
        status?: string;
      }>;
    }>;
  }
}
