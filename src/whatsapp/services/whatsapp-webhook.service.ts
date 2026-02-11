import { Injectable } from '@nestjs/common';
import { StatusResponse } from 'src/common/dto/response.dto';
import { CrearTransaccionBaseDto } from 'src/finance/dto/transaccion.dto';
import { TransaccionFinanceService } from 'src/finance/services/transaccion-finance.service';
import { Usuario } from 'src/security/entities/usuario.entity';
import { WhatsappLinkService } from 'src/security/services/whatsapp-link.service';

@Injectable()
export class WhatsappWebhookService {
  constructor(
    private readonly whatsappLinkService: WhatsappLinkService,
    private readonly transaccionFinanceService: TransaccionFinanceService,
  ) {}

  verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
      return challenge ?? '';
    }
    return null;
  }

  async processIncoming(payload: any): Promise<StatusResponse<any>> {
    try {
      const messages = this.extractMessages(payload);

      for (const item of messages) {
        const user = await this.whatsappLinkService.findVerifiedUserByWhatsapp(item.from);
        if (!user) {
          continue;
        }

        const parsed = this.parseTextToTransaction(item.text);
        if (!parsed) {
          continue;
        }

        await this.transaccionFinanceService.createFromWhatsapp(
          parsed.dto,
          user,
          parsed.tipo,
          item.messageId,
          item.from,
        );
      }

      return new StatusResponse(true, 200, 'Webhook procesado', null);
    } catch (error) {
      console.error('Error procesando webhook WhatsApp:', error);
      return new StatusResponse(false, 500, 'Error procesando webhook', error);
    }
  }

  private extractMessages(payload: any): Array<{
    from: string;
    messageId: string;
    text: string;
  }> {
    const result: Array<{ from: string; messageId: string; text: string }> = [];
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const values = change?.value;
        const messages = values?.messages ?? [];
        for (const msg of messages) {
          if (!msg?.from || !msg?.id || !msg?.text?.body) continue;
          result.push({
            from: msg.from.startsWith('+') ? msg.from : `+${msg.from}`,
            messageId: msg.id,
            text: msg.text.body,
          });
        }
      }
    }

    return result;
  }

  private parseTextToTransaction(text: string): {
    tipo: 'INGRESO' | 'EGRESO';
    dto: CrearTransaccionBaseDto;
  } | null {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const parts = cleaned.split(' ');
    if (parts.length < 5) return null;

    const tipoRaw = parts[0].toLowerCase();
    const tipo = tipoRaw === 'ingreso' ? 'INGRESO' : tipoRaw === 'egreso' ? 'EGRESO' : null;
    if (!tipo) return null;

    const monto = Number(parts[1]);
    const idCuenta = Number(parts[2]);
    const idCategoria = Number(parts[3]);
    if (!monto || !idCuenta || !idCategoria) return null;

    const concepto = parts.slice(4).join(' ');
    if (!concepto) return null;

    return {
      tipo,
      dto: {
        monto,
        idCuenta,
        idCategoria,
        concepto,
      },
    };
  }
}
