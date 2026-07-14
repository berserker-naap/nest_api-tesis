import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  CreateMessagingCampaignDto,
  UpdateMessagingCampaignDto,
} from '../dto/messaging-campaign.dto';
import { MessagingCampaignService } from '../services/messaging-campaign.service';

@Controller('campaigns')
@Auth()
export class MessagingCampaignController {
  constructor(
    private readonly messagingCampaignService: MessagingCampaignService,
  ) {}

  @Get('me')
  listMyCampaigns(
    @GetUsuario() usuario: Usuario,
    @Query('limit') limit?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    return this.messagingCampaignService.listMyCampaigns(usuario, {
      limit,
      onlyUnread,
    });
  }

  @Get('me/unread-count')
  getMyUnreadCount(@GetUsuario() usuario: Usuario) {
    return this.messagingCampaignService.getMyUnreadCount(usuario);
  }

  @Post('me/:id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingCampaignService.markAsRead(id, usuario, ip);
  }

  @Get()
  listCampaigns() {
    return this.messagingCampaignService.listCampaigns();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.messagingCampaignService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateMessagingCampaignDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingCampaignService.create(dto, usuario, ip);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessagingCampaignDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingCampaignService.update(id, dto, usuario, ip);
  }

  @Post(':id/send')
  send(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingCampaignService.send(id, usuario, ip);
  }
}
