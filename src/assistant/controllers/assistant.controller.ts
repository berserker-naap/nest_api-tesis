import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  AssistantChatDto,
  AssistantListMessagesQueryDto,
  AssistantListSessionsQueryDto,
  CreateAssistantSessionDto,
} from '../dto/assistant.dto';
import { AssistantChatService } from '../services/assistant-chat.service';

@Controller()
@Auth()
export class AssistantController {
  constructor(private readonly assistantChatService: AssistantChatService) {}

  @Post('sessions')
  createSession(
    @Body() dto: CreateAssistantSessionDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.assistantChatService.createSession(dto, usuario, ip);
  }

  @Get('sessions')
  listSessions(
    @Query() query: AssistantListSessionsQueryDto,
    @GetUsuario() usuario: Usuario,
  ) {
    return this.assistantChatService.listSessions(query, usuario);
  }

  @Get('sessions/:id/messages')
  listMessages(
    @Param('id', ParseIntPipe) sessionId: number,
    @Query() query: AssistantListMessagesQueryDto,
    @GetUsuario() usuario: Usuario,
  ) {
    return this.assistantChatService.listMessages(sessionId, query, usuario);
  }

  @Post('chat')
  chat(
    @Body() dto: AssistantChatDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.assistantChatService.chat(dto, usuario, ip);
  }
}
