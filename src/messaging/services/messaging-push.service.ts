import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  PushDispatchResponseDto,
  SendNativePushDto,
  SendTemplatePushDto,
} from '../dto/send-push.dto';
import {
  PushInstallationResponseDto,
  UpsertPushInstallationDto,
} from '../dto/push-installation.dto';
import { PushInstallation } from '../entities/push-installation.entity';
import { PushPlatform } from '../enums/push-platform.enum';
import { FirebasePushService } from './firebase-push.service';
import { PushNotificationLogService } from './push-notification-log.service';

type InstallationTemplate = {
  body: string;
  headers?: Record<string, string>;
  tags?: string[];
  expiry?: string;
};

type ResolvedInstallationTarget = {
  expression: string;
  installations: PushInstallation[];
};

type FirebaseDispatchSummary = {
  provider: string;
  status: string;
  providerMessageId: string | null;
  successCount: number;
  failureCount: number;
  detail?: string | null;
};

@Injectable()
export class MessagingPushService {
  constructor(
    @InjectRepository(PushInstallation)
    private readonly pushInstallationRepository: Repository<PushInstallation>,
    private readonly configService: ConfigService,
    private readonly firebasePushService: FirebasePushService,
    private readonly pushNotificationLogService: PushNotificationLogService,
  ) {}

  async listMyInstallations(
    usuario: Usuario,
  ): Promise<StatusResponse<PushInstallationResponseDto[]>> {
    const data = await this.pushInstallationRepository.find({
      where: {
        idUsuario: usuario.id,
        activo: true,
        eliminado: false,
      },
      order: {
        fechaModificacion: 'DESC',
        fechaRegistro: 'DESC',
        id: 'DESC',
      },
    });

    return new StatusResponse(
      true,
      200,
      'Instalaciones push obtenidas',
      data.map((item) => this.toInstallationDto(item)),
    );
  }

  async upsertInstallation(
    installationId: string,
    dto: UpsertPushInstallationDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<PushInstallationResponseDto | null>> {
    try {
      const normalizedInstallationId =
        this.normalizeInstallationId(installationId);
      const pushChannel = dto.pushChannel.trim();
      const tags = this.buildInstallationTags(dto.tags, usuario.id);
      const templates = this.buildInstallationTemplates(dto);
      const providerUserKey = `usuario:${usuario.id}`;

      let entity = await this.pushInstallationRepository.findOne({
        where: {
          installationId: normalizedInstallationId,
        },
      });

      if (!entity) {
        entity = this.pushInstallationRepository.create({
          installationId: normalizedInstallationId,
          idUsuario: usuario.id,
          usuarioLogin: usuario.login,
          platform: dto.platform,
          pushChannel,
          tagsJson: JSON.stringify(tags),
          templatesJson: templates ? JSON.stringify(templates) : null,
          azureUserId: providerUserKey,
          hasDefaultTemplate: dto.enableDefaultTemplate !== false,
          lastSyncAt: new Date(),
          lastError: null,
          activo: true,
          eliminado: false,
          ipRegistro: ip,
          usuarioRegistro: usuario.login,
        });
      } else {
        entity.idUsuario = usuario.id;
        entity.usuarioLogin = usuario.login;
        entity.platform = dto.platform;
        entity.pushChannel = pushChannel;
        entity.tagsJson = JSON.stringify(tags);
        entity.templatesJson = templates ? JSON.stringify(templates) : null;
        entity.azureUserId = providerUserKey;
        entity.hasDefaultTemplate = dto.enableDefaultTemplate !== false;
        entity.lastSyncAt = new Date();
        entity.lastError = null;
        entity.activo = true;
        entity.eliminado = false;
        entity.ipModificacion = ip;
        entity.usuarioModificacion = usuario.login;
        entity.fechaModificacion = new Date();
      }

      const saved = await this.pushInstallationRepository.save(entity);

      return new StatusResponse(
        true,
        200,
        'Instalacion push sincronizada',
        this.toInstallationDto(saved),
      );
    } catch (error) {
      return this.toErrorResponse(error, 'Error al sincronizar instalacion push');
    }
  }

  async deleteInstallation(
    installationId: string,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<null>> {
    try {
      const normalizedInstallationId =
        this.normalizeInstallationId(installationId);
      const entity = await this.pushInstallationRepository.findOne({
        where: {
          installationId: normalizedInstallationId,
          idUsuario: usuario.id,
          activo: true,
          eliminado: false,
        },
      });

      if (!entity) {
        throw new NotFoundException('Instalacion push no encontrada');
      }

      entity.activo = false;
      entity.eliminado = true;
      entity.fechaEliminacion = new Date();
      entity.usuarioEliminacion = usuario.login;
      entity.ipEliminacion = ip;
      entity.lastSyncAt = new Date();
      entity.lastError = null;

      await this.pushInstallationRepository.save(entity);

      return new StatusResponse(true, 200, 'Instalacion push eliminada', null);
    } catch (error) {
      return this.toErrorResponse(error, 'Error al eliminar instalacion push');
    }
  }

  async sendTemplate(
    dto: SendTemplatePushDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<PushDispatchResponseDto | null>> {
    const target = await this.resolveInstallations(
      dto.installationId,
      dto.tagExpression,
      usuario.id,
    );
    const effectiveTarget = this.resolveTargetForEnvironment(target.expression);
    const payload = this.buildTemplatePayload(dto);

    try {
      const effectiveInstallations = await this.applyEnvironmentFilter(
        target.installations,
        effectiveTarget,
      );
      const providerResult = await this.sendToInstallations(
        effectiveInstallations,
        {
          title: dto.title,
          message: dto.message,
          deepLink: dto.deepLink ?? null,
          data: payload,
        },
      );

      await this.pushNotificationLogService.logOutgoing({
        status: providerResult.status,
        provider: providerResult.provider,
        platform: 'TEMPLATE',
        format: 'template',
        targetExpression: effectiveTarget,
        title: dto.title,
        messagePreview: dto.message,
        providerMessageId: providerResult.providerMessageId,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        detail: providerResult.detail ?? null,
        payload,
        ip,
      });

      return new StatusResponse(true, 200, 'Push template enviado', {
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId,
        status: providerResult.status,
        format: 'template',
        platform: 'TEMPLATE',
        targetExpression: effectiveTarget,
        title: dto.title,
        message: dto.message,
        testMode: effectiveTarget !== target.expression,
      });
    } catch (error) {
      await this.pushNotificationLogService.logOutgoing({
        status: 'FAILED',
        provider: 'FIREBASE_CLOUD_MESSAGING',
        platform: 'TEMPLATE',
        format: 'template',
        targetExpression: effectiveTarget,
        title: dto.title,
        messagePreview: dto.message,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        detail: error instanceof Error ? error.message : 'error_no_controlado',
        payload,
        ip,
      });
      return this.toErrorResponse(error, 'Error al enviar push template');
    }
  }

  async sendNative(
    dto: SendNativePushDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<PushDispatchResponseDto | null>> {
    const target = await this.resolveInstallations(
      dto.installationId,
      dto.tagExpression,
      usuario.id,
    );
    const effectiveTarget = this.resolveTargetForEnvironment(target.expression);
    const payload = this.buildNativePayload(dto);

    try {
      const effectiveInstallations = await this.applyEnvironmentFilter(
        target.installations,
        effectiveTarget,
      );
      const providerResult = await this.sendToInstallations(
        effectiveInstallations,
        {
          title: dto.title ?? null,
          message: dto.message,
          deepLink: dto.deepLink ?? null,
          badge: dto.badge,
          sound: dto.sound ?? null,
          data: payload,
        },
      );

      await this.pushNotificationLogService.logOutgoing({
        status: providerResult.status,
        provider: providerResult.provider,
        platform: dto.platform,
        format: dto.platform === PushPlatform.FCMV1 ? 'firebase' : 'firebase-ios',
        targetExpression: effectiveTarget,
        title: dto.title ?? null,
        messagePreview: dto.message,
        providerMessageId: providerResult.providerMessageId,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        detail: providerResult.detail ?? null,
        payload,
        ip,
      });

      return new StatusResponse(true, 200, 'Push nativo enviado', {
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId,
        status: providerResult.status,
        format: dto.platform === PushPlatform.FCMV1 ? 'firebase' : 'firebase-ios',
        platform: dto.platform,
        targetExpression: effectiveTarget,
        title: dto.title ?? null,
        message: dto.message,
        testMode: effectiveTarget !== target.expression,
      });
    } catch (error) {
      await this.pushNotificationLogService.logOutgoing({
        status: 'FAILED',
        provider: 'FIREBASE_CLOUD_MESSAGING',
        platform: dto.platform,
        format: dto.platform === PushPlatform.FCMV1 ? 'firebase' : 'firebase-ios',
        targetExpression: effectiveTarget,
        title: dto.title ?? null,
        messagePreview: dto.message,
        idUsuario: usuario.id,
        usuarioLogin: usuario.login,
        detail: error instanceof Error ? error.message : 'error_no_controlado',
        payload,
        ip,
      });
      return this.toErrorResponse(error, 'Error al enviar push nativo');
    }
  }

  private buildInstallationTags(
    customTags: string[] | undefined,
    usuarioId: number,
  ): string[] {
    const baseTags = ['all-users', `user:${usuarioId}`];
    const sanitizedCustom = (customTags ?? [])
      .map((item) => this.sanitizeTag(item))
      .filter((item): item is string => Boolean(item));

    const unique = [...new Set([...baseTags, ...sanitizedCustom])];
    if (unique.length > 60) {
      throw new BadRequestException(
        'Se soporta como maximo 60 tags por dispositivo',
      );
    }

    return unique;
  }

  private buildInstallationTemplates(
    dto: UpsertPushInstallationDto,
  ): Record<string, InstallationTemplate> | undefined {
    const templates: Record<string, InstallationTemplate> = {};

    if (dto.enableDefaultTemplate !== false) {
      templates.default = this.buildDefaultTemplate(dto.platform);
    }

    if (dto.templates) {
      for (const [name, value] of Object.entries(dto.templates)) {
        const templateName = name.trim();
        if (!templateName) {
          continue;
        }
        templates[templateName] = {
          body: String(value.body ?? '').trim(),
          headers: value.headers,
          tags: value.tags
            ?.map((item) => this.sanitizeTag(item))
            .filter(Boolean) as string[] | undefined,
          expiry: value.expiry,
        };
      }
    }

    return Object.keys(templates).length > 0 ? templates : undefined;
  }

  private buildDefaultTemplate(platform: PushPlatform): InstallationTemplate {
    if (platform === PushPlatform.FCMV1) {
      return {
        body: JSON.stringify({
          notification: {
            title: '$(title)',
            body: '$(message)',
          },
          data: {
            title: '$(title)',
            message: '$(message)',
            deepLink: '$(deepLink)',
            campaignId: '$(campaignId)',
          },
        }),
      };
    }

    return {
      body: JSON.stringify({
        notification: {
          title: '$(title)',
          body: '$(message)',
        },
        data: {
          deepLink: '$(deepLink)',
          campaignId: '$(campaignId)',
        },
      }),
    };
  }

  private buildTemplatePayload(
    dto: SendTemplatePushDto,
  ): Record<string, string> {
    const payload: Record<string, string> = {
      title: dto.title.trim(),
      message: dto.message.trim(),
      deepLink: dto.deepLink?.trim() ?? '',
      campaignId: '',
    };

    for (const [key, value] of Object.entries(dto.variables ?? {})) {
      const normalizedKey = key.trim();
      if (!normalizedKey) {
        continue;
      }
      payload[normalizedKey] =
        value === undefined || value === null ? '' : String(value);
    }

    return payload;
  }

  private buildNativePayload(
    dto: SendNativePushDto,
  ): Record<string, string> {
    return this.toStringRecord({
      message: dto.message.trim(),
      title: dto.title?.trim() ?? '',
      deepLink: dto.deepLink?.trim() ?? '',
      ...(dto.data ?? {}),
    });
  }

  private async resolveInstallations(
    installationId: string | undefined,
    tagExpression: string | undefined,
    usuarioId: number,
  ): Promise<ResolvedInstallationTarget> {
    const normalizedInstallationId = installationId?.trim();
    if (normalizedInstallationId) {
      const installations = await this.pushInstallationRepository.find({
        where: {
          installationId: normalizedInstallationId,
          activo: true,
          eliminado: false,
        },
      });
      return {
        expression: `installation:${normalizedInstallationId}`,
        installations,
      };
    }

    const normalizedTagExpression = tagExpression?.trim();
    if (normalizedTagExpression) {
      this.assertSupportedTagExpression(normalizedTagExpression);
      const installations = await this.findInstallationsByTag(
        normalizedTagExpression,
      );
      return {
        expression: normalizedTagExpression,
        installations,
      };
    }

    const defaultExpression = `user:${usuarioId}`;
    const installations = await this.findInstallationsByTag(defaultExpression);
    return {
      expression: defaultExpression,
      installations,
    };
  }

  private resolveTargetForEnvironment(targetExpression: string): string {
    const testMode = ['1', 'true', 'yes', 'on'].includes(
      String(this.configService.get<string>('FIREBASE_PUSH_TEST_MODE') ?? '')
        .trim()
        .toLowerCase(),
    );

    if (!testMode) {
      return targetExpression;
    }

    const testTag = this.configService.get<string>('FIREBASE_PUSH_TEST_TAG')?.trim();
    if (!testTag) {
      throw new InternalServerErrorException(
        'FIREBASE_PUSH_TEST_MODE esta activo pero falta FIREBASE_PUSH_TEST_TAG',
      );
    }

    return testTag;
  }

  private async applyEnvironmentFilter(
    installations: PushInstallation[],
    effectiveExpression: string,
  ): Promise<PushInstallation[]> {
    this.assertSupportedTagExpression(effectiveExpression);

    if (effectiveExpression.startsWith('installation:')) {
      const installationId = effectiveExpression.slice('installation:'.length);
      return installations.filter(
        (item) =>
          item.installationId === installationId && item.activo && !item.eliminado,
      );
    }

    const tagMatched = await this.findInstallationsByTag(effectiveExpression);
    const allowedIds = new Set(tagMatched.map((item) => item.id));
    return installations.filter((item) => allowedIds.has(item.id));
  }

  private async findInstallationsByTag(tag: string): Promise<PushInstallation[]> {
    const installations = await this.pushInstallationRepository.find({
      where: {
        activo: true,
        eliminado: false,
      },
      order: {
        fechaModificacion: 'DESC',
        fechaRegistro: 'DESC',
        id: 'DESC',
      },
    });

    return installations.filter((item) =>
      this.parseStringArray(item.tagsJson).includes(tag),
    );
  }

  private assertSupportedTagExpression(tagExpression: string): void {
    if (
      tagExpression.includes('&&') ||
      tagExpression.includes('||') ||
      tagExpression.includes('!') ||
      tagExpression.includes('(') ||
      tagExpression.includes(')')
    ) {
      throw new BadRequestException(
        'Firebase directo solo soporta targeting simple por tag o instalacion',
      );
    }
  }

  private async sendToInstallations(
    installations: PushInstallation[],
    payload: {
      title?: string | null;
      message: string;
      deepLink?: string | null;
      badge?: number;
      sound?: string | null;
      data?: Record<string, string>;
    },
  ): Promise<FirebaseDispatchSummary> {
    const activeInstallations = installations.filter(
      (item) => item.activo && !item.eliminado && item.pushChannel?.trim(),
    );

    if (activeInstallations.length === 0) {
      throw new NotFoundException(
        'No se encontraron dispositivos registrados para el target indicado',
      );
    }

    const deduped = Array.from(
      new Map(
        activeInstallations.map((item) => [`${item.platform}:${item.pushChannel}`, item]),
      ).values(),
    );

    let successCount = 0;
    let failureCount = 0;
    let lastProviderMessageId: string | null = null;
    const failureDetails: string[] = [];

    for (const installation of deduped) {
      const result = await this.firebasePushService.sendToToken(
        installation.pushChannel,
        installation.platform as PushPlatform,
        payload,
      );

      installation.lastSyncAt = new Date();
      installation.lastError = result.detail ?? null;

      if (result.status !== 'FAILED') {
        successCount += 1;
        lastProviderMessageId = result.providerMessageId ?? lastProviderMessageId;
      } else {
        failureCount += 1;
        failureDetails.push(
          `${installation.installationId}: ${result.detail ?? 'firebase_send_failed'}`,
        );

        if (this.isTokenNoLongerValid(result.errorCode)) {
          installation.activo = false;
          installation.eliminado = true;
          installation.fechaEliminacion = new Date();
          installation.usuarioEliminacion =
            installation.usuarioModificacion ??
            installation.usuarioRegistro ??
            installation.usuarioLogin;
          installation.ipEliminacion =
            installation.ipModificacion ?? installation.ipRegistro ?? 'system';
        }
      }

      await this.pushInstallationRepository.save(installation);
    }

    if (successCount === 0) {
      throw new InternalServerErrorException(
        failureDetails.join(' | ') || 'No se pudo enviar push por Firebase',
      );
    }

    return {
      provider: 'FIREBASE_CLOUD_MESSAGING',
      status: failureCount > 0 ? '207' : '200',
      providerMessageId: lastProviderMessageId,
      successCount,
      failureCount,
      detail: failureDetails.length > 0 ? failureDetails.join(' | ') : null,
    };
  }

  private isTokenNoLongerValid(errorCode: string | null | undefined): boolean {
    return ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'].includes(
      String(errorCode ?? '')
        .trim()
        .toUpperCase(),
    );
  }

  private sanitizeTag(value: string | undefined | null): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const safe = normalized.replace(/[^a-z0-9:_\-.@]/g, '-').replace(/-+/g, '-');
    return safe.length > 0 ? safe : null;
  }

  private normalizeInstallationId(value: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      throw new BadRequestException('installationId es obligatorio');
    }
    if (normalized.length > 150) {
      throw new BadRequestException(
        'installationId excede el maximo permitido',
      );
    }
    return normalized;
  }

  private toInstallationDto(entity: PushInstallation): PushInstallationResponseDto {
    return {
      installationId: entity.installationId,
      platform: entity.platform as PushPlatform,
      pushChannel: entity.pushChannel,
      tags: this.parseStringArray(entity.tagsJson),
      azureUserId: entity.azureUserId,
      hasDefaultTemplate: entity.hasDefaultTemplate,
      lastSyncAt: entity.lastSyncAt,
      lastError: entity.lastError,
    };
  }

  private parseStringArray(value: string | null): string[] {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  private toStringRecord(
    value: Record<string, string | number | boolean | null>,
  ): Record<string, string> {
    return Object.entries(value).reduce<Record<string, string>>(
      (acc, [key, item]) => {
        acc[key] = item === undefined || item === null ? '' : String(item);
        return acc;
      },
      {},
    );
  }

  private toErrorResponse(
    error: unknown,
    fallbackMessage: string,
  ): StatusResponse<null> {
    const knownError =
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException;

    return new StatusResponse(
      false,
      knownError ? error.getStatus() : 500,
      knownError ? error.message : fallbackMessage,
      null,
    );
  }
}
