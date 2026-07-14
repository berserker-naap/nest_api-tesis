import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Repository } from 'typeorm';
import {
  CreateMessagingCampaignDto,
  MessagingCampaignInboxItemDto,
  MessagingCampaignResponseDto,
  MessagingCampaignUnreadCountDto,
  UpdateMessagingCampaignDto,
} from '../dto/messaging-campaign.dto';
import { SendTemplatePushDto } from '../dto/send-push.dto';
import { MessagingCampaignRead } from '../entities/messaging-campaign-read.entity';
import { MessagingCampaign } from '../entities/messaging-campaign.entity';
import { MessagingCampaignScope } from '../enums/messaging-campaign-scope.enum';
import { MessagingCampaignStatus } from '../enums/messaging-campaign-status.enum';
import { MessagingPushService } from './messaging-push.service';

type CampaignQueryFilters = {
  limit?: string;
  onlyUnread?: string;
};

type CampaignInboxRawItem = {
  campaign_id: number;
  campaign_title: string;
  campaign_message: string;
  campaign_deepLink: string | null;
  campaign_sentAt: Date | null;
  read_readAt: Date | null;
};

@Injectable()
export class MessagingCampaignService {
  constructor(
    @InjectRepository(MessagingCampaign)
    private readonly campaignRepository: Repository<MessagingCampaign>,
    @InjectRepository(MessagingCampaignRead)
    private readonly campaignReadRepository: Repository<MessagingCampaignRead>,
    private readonly messagingPushService: MessagingPushService,
  ) {}

  async listCampaigns(): Promise<StatusResponse<MessagingCampaignResponseDto[]>> {
    const data = await this.campaignRepository.find({
      where: {
        eliminado: false,
      },
      order: {
        sentAt: 'DESC',
        fechaRegistro: 'DESC',
        id: 'DESC',
      },
    });

    return new StatusResponse(
      true,
      200,
      'Campanas obtenidas',
      data.map((item) => this.toCampaignDto(item)),
    );
  }

  async findOne(
    id: number,
  ): Promise<StatusResponse<MessagingCampaignResponseDto | null>> {
    const campaign = await this.requireCampaign(id);
    return new StatusResponse(
      true,
      200,
      'Campana obtenida',
      this.toCampaignDto(campaign),
    );
  }

  async create(
    dto: CreateMessagingCampaignDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingCampaignResponseDto | null>> {
    this.validateChannels(dto.sendPush, dto.publishInApp);

    const entity = this.campaignRepository.create({
      scope: dto.scope ?? MessagingCampaignScope.ALL_USERS,
      title: dto.title.trim(),
      message: dto.message.trim(),
      deepLink: this.normalizeOptionalString(dto.deepLink),
      sendPush: dto.sendPush ?? true,
      publishInApp: dto.publishInApp ?? true,
      status: MessagingCampaignStatus.DRAFT,
      sentAt: null,
      pushStatus: null,
      pushProviderMessageId: null,
      metadataJson: null,
      activo: true,
      eliminado: false,
      ipRegistro: ip,
      usuarioRegistro: usuario.login,
    });

    const saved = await this.campaignRepository.save(entity);
    return new StatusResponse(
      true,
      201,
      'Campana creada',
      this.toCampaignDto(saved),
    );
  }

  async update(
    id: number,
    dto: UpdateMessagingCampaignDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingCampaignResponseDto | null>> {
    const campaign = await this.requireCampaign(id);
    if (campaign.status === MessagingCampaignStatus.SENT) {
      throw new BadRequestException(
        'No se puede editar una campana que ya fue enviada',
      );
    }

    const nextSendPush = dto.sendPush ?? campaign.sendPush;
    const nextPublishInApp = dto.publishInApp ?? campaign.publishInApp;
    this.validateChannels(nextSendPush, nextPublishInApp);

    if (dto.scope) {
      campaign.scope = dto.scope;
    }
    if (dto.title !== undefined) {
      campaign.title = dto.title.trim();
    }
    if (dto.message !== undefined) {
      campaign.message = dto.message.trim();
    }
    if (dto.deepLink !== undefined) {
      campaign.deepLink = this.normalizeOptionalString(dto.deepLink);
    }
    if (dto.sendPush !== undefined) {
      campaign.sendPush = dto.sendPush;
    }
    if (dto.publishInApp !== undefined) {
      campaign.publishInApp = dto.publishInApp;
    }

    campaign.ipModificacion = ip;
    campaign.usuarioModificacion = usuario.login;
    campaign.fechaModificacion = new Date();

    const saved = await this.campaignRepository.save(campaign);
    return new StatusResponse(
      true,
      200,
      'Campana actualizada',
      this.toCampaignDto(saved),
    );
  }

  async send(
    id: number,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<MessagingCampaignResponseDto | null>> {
    const campaign = await this.requireCampaign(id);
    if (campaign.status === MessagingCampaignStatus.SENT) {
      throw new BadRequestException('La campana ya fue enviada');
    }
    this.validateChannels(campaign.sendPush, campaign.publishInApp);

    let pushStatus: string | null = null;
    let pushProviderMessageId: string | null = null;

    if (campaign.sendPush) {
      const pushPayload: SendTemplatePushDto = {
        tagExpression: 'all-users',
        title: campaign.title,
        message: campaign.message,
        deepLink: campaign.deepLink ?? undefined,
        variables: {
          campaignId: String(campaign.id),
          campaignScope: campaign.scope,
        },
      };

      const pushResponse = await this.messagingPushService.sendTemplate(
        pushPayload,
        usuario,
        ip,
      );

      if (!pushResponse.ok || !pushResponse.data) {
        throw new BadRequestException(pushResponse.message);
      }

      pushStatus = pushResponse.data.status;
      pushProviderMessageId = pushResponse.data.providerMessageId;
    }

    campaign.status = MessagingCampaignStatus.SENT;
    campaign.sentAt = new Date();
    campaign.pushStatus = pushStatus;
    campaign.pushProviderMessageId = pushProviderMessageId;
    campaign.metadataJson = JSON.stringify({
      deepLink: campaign.deepLink,
      sendPush: campaign.sendPush,
      publishInApp: campaign.publishInApp,
      scope: campaign.scope,
    });
    campaign.ipModificacion = ip;
    campaign.usuarioModificacion = usuario.login;
    campaign.fechaModificacion = new Date();

    const saved = await this.campaignRepository.save(campaign);
    return new StatusResponse(
      true,
      200,
      'Campana enviada',
      this.toCampaignDto(saved),
    );
  }

  async listMyCampaigns(
    usuario: Usuario,
    filters: CampaignQueryFilters,
  ): Promise<StatusResponse<MessagingCampaignInboxItemDto[]>> {
    const limit = this.parseLimit(filters.limit);
    const onlyUnread = this.parseBoolean(filters.onlyUnread);

    const query = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin(
        MessagingCampaignRead,
        'read',
        'read.idCampaign = campaign.id AND read.idUsuario = :usuarioId',
        { usuarioId: usuario.id },
      )
      .where('campaign.activo = :activo', { activo: true })
      .andWhere('campaign.eliminado = :eliminado', { eliminado: false })
      .andWhere('campaign.publishInApp = :publishInApp', {
        publishInApp: true,
      })
      .andWhere('campaign.status = :status', {
        status: MessagingCampaignStatus.SENT,
      })
      .andWhere('campaign.scope = :scope', {
        scope: MessagingCampaignScope.ALL_USERS,
      })
      .select([
        'campaign.id AS campaign_id',
        'campaign.title AS campaign_title',
        'campaign.message AS campaign_message',
        'campaign.deepLink AS campaign_deepLink',
        'campaign.sentAt AS campaign_sentAt',
        'read.readAt AS read_readAt',
      ])
      .orderBy('campaign.sentAt', 'DESC')
      .addOrderBy('campaign.fechaRegistro', 'DESC')
      .take(limit);

    if (onlyUnread) {
      query.andWhere('read.id IS NULL');
    }

    const rows = await query.getRawMany<CampaignInboxRawItem>();

    return new StatusResponse(
      true,
      200,
      'Notificaciones obtenidas',
      rows.map((item) => ({
        id: Number(item.campaign_id),
        title: item.campaign_title,
        message: item.campaign_message,
        deepLink: item.campaign_deepLink,
        sentAt: item.campaign_sentAt,
        readAt: item.read_readAt,
        isRead: Boolean(item.read_readAt),
      })),
    );
  }

  async getMyUnreadCount(
    usuario: Usuario,
  ): Promise<StatusResponse<MessagingCampaignUnreadCountDto>> {
    const unreadCount = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin(
        MessagingCampaignRead,
        'read',
        'read.idCampaign = campaign.id AND read.idUsuario = :usuarioId',
        { usuarioId: usuario.id },
      )
      .where('campaign.activo = :activo', { activo: true })
      .andWhere('campaign.eliminado = :eliminado', { eliminado: false })
      .andWhere('campaign.publishInApp = :publishInApp', {
        publishInApp: true,
      })
      .andWhere('campaign.status = :status', {
        status: MessagingCampaignStatus.SENT,
      })
      .andWhere('campaign.scope = :scope', {
        scope: MessagingCampaignScope.ALL_USERS,
      })
      .andWhere('read.id IS NULL')
      .getCount();

    return new StatusResponse(true, 200, 'Conteo obtenido', { unreadCount });
  }

  async markAsRead(
    id: number,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<null>> {
    const campaign = await this.requireCampaign(id);
    if (
      campaign.status !== MessagingCampaignStatus.SENT ||
      !campaign.publishInApp ||
      campaign.scope !== MessagingCampaignScope.ALL_USERS
    ) {
      throw new BadRequestException(
        'La campana indicada no esta disponible en la bandeja del usuario',
      );
    }

    let read = await this.campaignReadRepository.findOne({
      where: {
        idCampaign: campaign.id,
        idUsuario: usuario.id,
      },
    });

    if (!read) {
      read = this.campaignReadRepository.create({
        idCampaign: campaign.id,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        readAt: new Date(),
        activo: true,
        eliminado: false,
        ipRegistro: ip,
        usuarioRegistro: usuario.login,
      });
    } else {
      read.readAt = read.readAt ?? new Date();
      read.ipModificacion = ip;
      read.usuarioModificacion = usuario.login;
      read.fechaModificacion = new Date();
    }

    await this.campaignReadRepository.save(read);
    return new StatusResponse(true, 200, 'Notificacion marcada como leida', null);
  }

  private async requireCampaign(id: number): Promise<MessagingCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: {
        id,
        eliminado: false,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campana no encontrada');
    }

    return campaign;
  }

  private validateChannels(
    sendPush: boolean | undefined,
    publishInApp: boolean | undefined,
  ): void {
    if ((sendPush ?? true) || (publishInApp ?? true)) {
      return;
    }
    throw new BadRequestException(
      'La campana debe usar al menos un canal: push o bandeja interna',
    );
  }

  private normalizeOptionalString(value: string | undefined): string | null {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseLimit(value: string | undefined): number {
    const numeric = Number(value ?? 40);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 40;
    }
    return Math.min(Math.floor(numeric), 100);
  }

  private parseBoolean(value: string | undefined): boolean {
    return ['1', 'true', 'yes', 'on'].includes(
      String(value ?? '')
        .trim()
        .toLowerCase(),
    );
  }

  private toCampaignDto(
    entity: MessagingCampaign,
  ): MessagingCampaignResponseDto {
    return {
      id: entity.id,
      scope: entity.scope as MessagingCampaignScope,
      title: entity.title,
      message: entity.message,
      deepLink: entity.deepLink,
      sendPush: entity.sendPush,
      publishInApp: entity.publishInApp,
      status: entity.status as MessagingCampaignStatus,
      sentAt: entity.sentAt,
      pushStatus: entity.pushStatus,
      pushProviderMessageId: entity.pushProviderMessageId,
      createdAt: entity.fechaRegistro,
      createdBy: entity.usuarioRegistro,
      updatedAt: entity.fechaModificacion,
      updatedBy: entity.usuarioModificacion,
    };
  }
}
