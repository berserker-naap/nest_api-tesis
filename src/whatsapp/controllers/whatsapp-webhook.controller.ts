import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WhatsappWebhookService } from '../services/whatsapp-webhook.service';

@Controller('webhook')
export class WhatsappWebhookController {
  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verified = this.webhookService.verifyWebhook(mode, token, challenge);
    if (verified !== null) {
      return res.status(200).send(verified);
    }
    return res.status(403).send('Forbidden');
  }

  @Post()
  @HttpCode(200)
  process(@Body() payload: any) {
    return this.webhookService.processIncoming(payload);
  }
}
