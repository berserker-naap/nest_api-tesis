import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailDispatchResult,
  EmailMessagePayload,
  EmailSenderProvider,
} from '../interfaces/email-message.interface';

type AzureEmailPoller = {
  pollUntilDone(): Promise<unknown>;
};

type AzureEmailClientLike = {
  beginSend(message: unknown): Promise<AzureEmailPoller>;
};

@Injectable()
export class AzureEmailProvider implements EmailSenderProvider {
  constructor(private readonly configService: ConfigService) {}

  async send(message: EmailMessagePayload): Promise<EmailDispatchResult> {
    const client = await this.getClient();
    const poller = await client.beginSend({
      senderAddress: message.from,
      content: {
        subject: message.subject,
        plainText: message.plainText ?? undefined,
        html: message.html ?? undefined,
      },
      recipients: {
        to: message.to.map((item) => this.toAzureAddress(item)),
        cc: message.cc?.map((item) => this.toAzureAddress(item)),
        bcc: message.bcc?.map((item) => this.toAzureAddress(item)),
      },
      replyTo: message.replyTo?.map((item) => this.toAzureAddress(item)),
    });

    const result = (await poller.pollUntilDone()) as {
      id?: string;
      status?: string;
    };

    return {
      provider: 'AZURE_COMMUNICATION_EMAIL',
      providerMessageId: this.toNullableString(result?.id, 200),
      status: this.toNullableString(result?.status, 60) ?? 'UNKNOWN',
      raw: result,
    };
  }

  private async getClient(): Promise<AzureEmailClientLike> {
    const connectionString = this.configService.get<string>(
      'AZURE_COMMUNICATION_CONNECTION_STRING',
    );

    if (!connectionString) {
      throw new InternalServerErrorException(
        'Falta configuracion Azure Email (AZURE_COMMUNICATION_CONNECTION_STRING)',
      );
    }

    try {
      const sdk = (await import(
        '@azure/communication-email'
      )) as unknown as {
        EmailClient: new (connectionString: string) => AzureEmailClientLike;
      };

      return new sdk.EmailClient(connectionString);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'sdk_no_disponible';
      throw new InternalServerErrorException(
        `No se pudo inicializar Azure Communication Email. Detalle: ${detail}`,
      );
    }
  }

  private toAzureAddress(item: {
    address: string;
    displayName?: string | null;
  }): {
    address: string;
    displayName?: string;
  } {
    return item.displayName
      ? { address: item.address, displayName: item.displayName }
      : { address: item.address };
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

