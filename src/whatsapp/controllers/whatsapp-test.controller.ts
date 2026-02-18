import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { StatusResponse } from 'src/common/dto/response.dto';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';
import { TestSendMessageDto } from '../dto/test-send-message.dto';
import { TestSendTemplateDto } from '../dto/test-send-template.dto';

@Controller('test')
export class WhatsappTestController {
  constructor(private readonly whatsappSenderService: WhatsappSenderService) {}

  @Post('send-message')
  @HttpCode(200)
  async sendMessage(@Body() dto: TestSendMessageDto): Promise<StatusResponse<null>> {
    await this.whatsappSenderService.sendTextMessage(dto.to, dto.message);
    return new StatusResponse(true, 200, 'Mensaje enviado por WhatsApp', null);
  }

  @Post('send-template')
  @HttpCode(200)
  async sendTemplate(@Body() dto: TestSendTemplateDto): Promise<StatusResponse<null>> {
    await this.whatsappSenderService.sendTemplateMessage(
      dto.to,
      dto.templateName ?? 'hello_world',
      dto.languageCode ?? 'en_US',
    );
    return new StatusResponse(true, 200, 'Plantilla enviada por WhatsApp', null);
  }
}
