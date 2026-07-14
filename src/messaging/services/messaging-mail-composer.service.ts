import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MessagingEmailTemplateCode,
} from '../constants/messaging-email-template.constants';

type TemplateContent = {
  subject: string;
  plainText: string;
  html: string;
};

@Injectable()
export class MessagingMailComposerService {
  compose(
    templateCode: MessagingEmailTemplateCode,
    variables?: Record<string, string | number | boolean | null>,
  ): TemplateContent {
    switch (templateCode) {
      case 'WELCOME':
        return this.buildWelcome(variables);
      case 'PASSWORD_RESET':
        return this.buildPasswordReset(variables);
      case 'GENERIC_NOTIFICATION':
        return this.buildGenericNotification(variables);
      default:
        throw new BadRequestException('Template de email no soportado');
    }
  }

  private buildWelcome(
    variables?: Record<string, string | number | boolean | null>,
  ): TemplateContent {
    const nombre = this.getString(variables, 'nombre', 'Usuario');
    const appName = this.getString(variables, 'appName', 'API TESIS');

    return {
      subject: `Bienvenido a ${appName}`,
      plainText: `Hola ${nombre}. Tu cuenta en ${appName} fue creada correctamente.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Bienvenido a ${this.escapeHtml(appName)}</h2>
          <p>Hola ${this.escapeHtml(nombre)}.</p>
          <p>Tu cuenta fue creada correctamente y ya puedes usar la plataforma.</p>
        </div>
      `.trim(),
    };
  }

  private buildPasswordReset(
    variables?: Record<string, string | number | boolean | null>,
  ): TemplateContent {
    const nombre = this.getString(variables, 'nombre', 'Usuario');
    const resetCode = this.getString(variables, 'resetCode');
    const resetLink = this.getString(variables, 'resetLink');

    if (!resetCode && !resetLink) {
      throw new BadRequestException(
        'El template PASSWORD_RESET requiere resetCode o resetLink',
      );
    }

    const actionLine = resetLink
      ? `Usa el siguiente enlace para continuar: ${resetLink}`
      : `Tu codigo de recuperacion es: ${resetCode}`;

    const htmlAction = resetLink
      ? `<p>Usa el siguiente enlace para continuar:</p><p><a href="${this.escapeHtml(
          resetLink,
        )}">${this.escapeHtml(resetLink)}</a></p>`
      : `<p>Tu codigo de recuperacion es:</p><p style="font-size: 20px; font-weight: 700;">${this.escapeHtml(
          resetCode ?? '',
        )}</p>`;

    return {
      subject: 'Recuperacion de acceso',
      plainText: `Hola ${nombre}. ${actionLine}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Recuperacion de acceso</h2>
          <p>Hola ${this.escapeHtml(nombre)}.</p>
          ${htmlAction}
        </div>
      `.trim(),
    };
  }

  private buildGenericNotification(
    variables?: Record<string, string | number | boolean | null>,
  ): TemplateContent {
    const subject = this.getString(variables, 'subject', 'Notificacion');
    const title = this.getString(variables, 'title', subject);
    const message = this.getString(
      variables,
      'message',
      'Tienes una nueva notificacion.',
    );

    return {
      subject,
      plainText: message,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>${this.escapeHtml(title)}</h2>
          <p>${this.escapeHtml(message)}</p>
        </div>
      `.trim(),
    };
  }

  private getString(
    variables: Record<string, string | number | boolean | null> | undefined,
    key: string,
    fallback?: string,
  ): string {
    const value = variables?.[key];
    if (value === undefined || value === null || String(value).trim().length === 0) {
      if (fallback !== undefined) {
        return fallback;
      }
      return '';
    }
    return String(value).trim();
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

