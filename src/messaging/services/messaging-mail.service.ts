import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { EMAIL_SENDER_PROVIDER } from '../constants/messaging.tokens';
import { MessagingEmailTemplateCode } from '../constants/messaging-email-template.constants';
import {
  MessagingEmailSendResponseDto,
  SendEmailDto,
  SendTemplateEmailDto,
} from '../dto/send-email.dto';
import {
  EmailAddress,
  EmailMessagePayload,
  EmailSenderProvider,
} from '../interfaces/email-message.interface';
import { EmailMessageLogService } from './email-message-log.service';
import { MessagingMailComposerService } from './messaging-mail-composer.service';

@Injectable()
export class MessagingMailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly composerService: MessagingMailComposerService,
    private readonly emailMessageLogService: EmailMessageLogService,
    @Inject(EMAIL_SENDER_PROVIDER)
    private readonly emailSenderProvider: EmailSenderProvider,
  ) {}

  async send(
    dto: SendEmailDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingEmailSendResponseDto | null>> {
    try {
      const payload = this.buildRawPayload(dto);
      const result = await this.dispatch(payload, dto.to, usuario, ip, null);

      return new StatusResponse(true, 200, 'Correo enviado correctamente', result);
    } catch (error) {
      return this.toErrorResponse(error, 'Error al enviar correo');
    }
  }

  async sendTemplate(
    dto: SendTemplateEmailDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingEmailSendResponseDto | null>> {
    try {
      const content = this.composerService.compose(dto.templateCode, dto.variables);
      const payload = this.applyRecipientPayload(
        {
          subject: content.subject,
          plainText: content.plainText,
          html: content.html,
          replyTo: dto.replyTo,
        },
        dto.to,
        dto.cc,
        dto.bcc,
      );

      const result = await this.dispatch(
        payload,
        dto.to,
        usuario,
        ip,
        dto.templateCode,
      );

      return new StatusResponse(
        true,
        200,
        'Correo de plantilla enviado correctamente',
        result,
      );
    } catch (error) {
      return this.toErrorResponse(error, 'Error al enviar correo de plantilla');
    }
  }

  async sendWelcomeEmail(
    to: string,
    nombre: string,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingEmailSendResponseDto | null>> {
    return this.sendTemplate(
      {
        to: [to],
        templateCode: 'WELCOME',
        variables: { nombre, appName: 'API TESIS' },
      },
      usuario,
      ip,
    );
  }

  private buildRawPayload(dto: SendEmailDto): EmailMessagePayload {
    if (!dto.plainText && !dto.html) {
      throw new BadRequestException(
        'Debe enviar plainText o html en el correo',
      );
    }

    return this.applyRecipientPayload(
      {
        subject: dto.subject,
        plainText: dto.plainText ?? null,
        html: dto.html ?? null,
        replyTo: dto.replyTo,
      },
      dto.to,
      dto.cc,
      dto.bcc,
    );
  }

  private applyRecipientPayload(
    content: {
      subject: string;
      plainText?: string | null;
      html?: string | null;
      replyTo?: string;
    },
    to: string[],
    cc?: string[],
    bcc?: string[],
  ): EmailMessagePayload {
    const senderAddress = this.configService.get<string>('AZURE_EMAIL_SENDER_ADDRESS');
    if (!senderAddress) {
      throw new InternalServerErrorException(
        'Falta configuracion Azure Email (AZURE_EMAIL_SENDER_ADDRESS)',
      );
    }

    const normalizedSubject = content.subject.trim();
    if (!normalizedSubject) {
      throw new BadRequestException('El asunto del correo es obligatorio');
    }

    const toRecipients = this.mapEmails(to);
    if (!toRecipients?.length) {
      throw new BadRequestException(
        'Debe enviar al menos un destinatario valido',
      );
    }

    const defaultReplyTo = this.configService.get<string>('AZURE_EMAIL_DEFAULT_REPLY_TO');
    const replyToAddress = content.replyTo?.trim() || defaultReplyTo?.trim();

    return {
      from: senderAddress,
      to: toRecipients,
      cc: this.mapEmails(cc),
      bcc: this.mapEmails(bcc),
      replyTo: replyToAddress ? [{ address: replyToAddress }] : undefined,
      subject: normalizedSubject,
      plainText: content.plainText?.trim() || null,
      html: content.html?.trim() || null,
    };
  }

  private async dispatch(
    payload: EmailMessagePayload,
    originalTo: string[],
    usuario: Usuario,
    ip: string,
    templateCode: MessagingEmailTemplateCode | null,
  ): Promise<MessagingEmailSendResponseDto> {
    const resolved = this.resolveRecipientsForEnvironment(payload);

    try {
      const providerResult = await this.emailSenderProvider.send(resolved.payload);

      await this.emailMessageLogService.logOutgoing({
        status: providerResult.status,
        provider: providerResult.provider,
        senderAddress: resolved.payload.from,
        recipients: resolved.recipients,
        subject: resolved.payload.subject,
        templateCode,
        providerMessageId: providerResult.providerMessageId,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        payload: resolved.payload,
        ip,
      });

      return {
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId,
        status: providerResult.status,
        subject: resolved.payload.subject,
        recipients: resolved.recipients,
        originalRecipients: originalTo,
        testMode: resolved.testMode,
        templateCode,
      };
    } catch (error) {
      await this.emailMessageLogService.logOutgoing({
        status: 'FAILED',
        provider: 'AZURE_COMMUNICATION_EMAIL',
        senderAddress: resolved.payload.from,
        recipients: resolved.recipients,
        subject: resolved.payload.subject,
        templateCode,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        detail: error instanceof Error ? error.message : 'error_no_controlado',
        payload: resolved.payload,
        ip,
      });
      throw error;
    }
  }

  private resolveRecipientsForEnvironment(payload: EmailMessagePayload): {
    payload: EmailMessagePayload;
    recipients: string[];
    testMode: boolean;
  } {
    const testMode = this.toBoolean(
      this.configService.get<string>('AZURE_EMAIL_TEST_MODE'),
    );

    if (!testMode) {
      return {
        payload,
        recipients: payload.to.map((item) => item.address),
        testMode: false,
      };
    }

    const testRecipient = this.configService.get<string>('AZURE_EMAIL_TEST_RECIPIENT');
    if (!testRecipient?.trim()) {
      throw new InternalServerErrorException(
        'AZURE_EMAIL_TEST_MODE esta activo pero falta AZURE_EMAIL_TEST_RECIPIENT',
      );
    }

    const originalRecipients = payload.to.map((item) => item.address).join(', ');
    const note = `[TEST MODE] Destinatarios originales: ${originalRecipients}`;
    const plainText = payload.plainText
      ? `${note}\n\n${payload.plainText}`
      : note;
    const htmlPrefix = `<p><strong>TEST MODE</strong> Destinatarios originales: ${this.escapeHtml(
      originalRecipients,
    )}</p>`;

    return {
      payload: {
        ...payload,
        to: [{ address: testRecipient.trim() }],
        cc: undefined,
        bcc: undefined,
        subject: `[TEST] ${payload.subject}`,
        plainText,
        html: payload.html ? `${htmlPrefix}${payload.html}` : htmlPrefix,
      },
      recipients: [testRecipient.trim()],
      testMode: true,
    };
  }

  private mapEmails(values?: string[]): EmailAddress[] | undefined {
    if (!values?.length) {
      return undefined;
    }
    const mapped = values
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index)
      .map((address) => ({ address }));

    return mapped.length > 0 ? mapped : undefined;
  }

  private toBoolean(value?: string | null): boolean {
    return ['1', 'true', 'yes', 'on'].includes(
      String(value ?? '')
        .trim()
        .toLowerCase(),
    );
  }

  private toErrorResponse(
    error: unknown,
    fallbackMessage: string,
  ): StatusResponse<null> {
    const knownError =
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException;

    return new StatusResponse(
      false,
      knownError ? error.getStatus() : 500,
      knownError ? error.message : fallbackMessage,
      null,
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
