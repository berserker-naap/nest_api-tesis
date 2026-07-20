import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { ServiceErrorLog } from 'src/common/entity/service-error-log.entity';
import { EmailMessageLog } from 'src/messaging/entities/email-message-log.entity';
import { PushNotificationLog } from 'src/messaging/entities/push-notification-log.entity';
import {
  Between,
  FindOperator,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { UsuarioRol } from '../entities/usuario-rol.entity';
import { WhatsappMessageLog } from '../entities/whatsapp-message-log.entity';

@Injectable()
export class ReportesService {
  private static readonly REPORTS_ROLES = ['ADMINISTRADOR', 'SOPORTE'];

  constructor(
    @InjectRepository(ServiceErrorLog)
    private readonly serviceErrorLogRepository: Repository<ServiceErrorLog>,
    @InjectRepository(WhatsappMessageLog)
    private readonly whatsappMessageLogRepository: Repository<WhatsappMessageLog>,
    @InjectRepository(EmailMessageLog)
    private readonly emailMessageLogRepository: Repository<EmailMessageLog>,
    @InjectRepository(PushNotificationLog)
    private readonly pushNotificationLogRepository: Repository<PushNotificationLog>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
  ) {}

  async getServiceErrors(
    usuario: Pick<Usuario, 'id' | 'login'>,
    limitValue?: string,
    fromValue?: string,
    toValue?: string,
  ): Promise<StatusResponse<any[]>> {
    await this.ensureReportesAccess(usuario.id);

    const items = await this.serviceErrorLogRepository.find({
      where: {
        eliminado: false,
        ...this.resolveDateFilter(fromValue, toValue),
      },
      order: { fechaRegistro: 'DESC', id: 'DESC' },
      take: this.resolveLimit(limitValue),
    });

    return new StatusResponse(true, 200, 'Bitacora de errores obtenida', items.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      moduleName: item.moduleName,
      serviceName: item.serviceName,
      methodName: item.methodName,
      errorType: item.errorType,
      statusCode: item.statusCode,
      message: item.message,
      detail: item.detail,
      stackTrace: item.stackTrace,
      httpMethod: item.httpMethod,
      route: item.route,
      idUsuario: item.idUsuario,
      usuarioLogin: item.usuarioLogin,
      ipRegistro: item.ipRegistro,
      fechaRegistro: item.fechaRegistro,
      payloadJson: item.payloadJson,
    })));
  }

  async getWhatsappLogs(
    usuario: Pick<Usuario, 'id' | 'login'>,
    limitValue?: string,
    fromValue?: string,
    toValue?: string,
  ): Promise<StatusResponse<any[]>> {
    await this.ensureReportesAccess(usuario.id);

    const items = await this.whatsappMessageLogRepository.find({
      where: {
        eliminado: false,
        ...this.resolveDateFilter(fromValue, toValue),
      },
      order: { fechaRegistro: 'DESC', id: 'DESC' },
      take: this.resolveLimit(limitValue),
    });

    return new StatusResponse(true, 200, 'Bitacora de WhatsApp obtenida', items.map((item) => ({
      id: item.id,
      direction: item.direction,
      status: item.status,
      phone: item.phone,
      providerMessageId: item.providerMessageId,
      idUsuario: item.idUsuario,
      usuarioLogin: item.usuarioLogin,
      idTransaccion: item.idTransaccion,
      text: item.text,
      detail: item.detail,
      ipRegistro: item.ipRegistro,
      fechaRegistro: item.fechaRegistro,
      payloadJson: item.payloadJson,
    })));
  }

  async getEmailLogs(
    usuario: Pick<Usuario, 'id' | 'login'>,
    limitValue?: string,
    fromValue?: string,
    toValue?: string,
  ): Promise<StatusResponse<any[]>> {
    await this.ensureReportesAccess(usuario.id);

    const items = await this.emailMessageLogRepository.find({
      where: {
        eliminado: false,
        ...this.resolveDateFilter(fromValue, toValue),
      },
      order: { fechaRegistro: 'DESC', id: 'DESC' },
      take: this.resolveLimit(limitValue),
    });

    return new StatusResponse(true, 200, 'Bitacora de correos obtenida', items.map((item) => ({
      id: item.id,
      status: item.status,
      provider: item.provider,
      senderAddress: item.senderAddress,
      recipientsSummary: item.recipientsSummary,
      subject: item.subject,
      templateCode: item.templateCode,
      providerMessageId: item.providerMessageId,
      idUsuario: item.idUsuario,
      usuarioLogin: item.usuarioLogin,
      detail: item.detail,
      ipRegistro: item.ipRegistro,
      fechaRegistro: item.fechaRegistro,
      payloadJson: item.payloadJson,
    })));
  }

  async getPushLogs(
    usuario: Pick<Usuario, 'id' | 'login'>,
    limitValue?: string,
    fromValue?: string,
    toValue?: string,
  ): Promise<StatusResponse<any[]>> {
    await this.ensureReportesAccess(usuario.id);

    const items = await this.pushNotificationLogRepository.find({
      where: {
        eliminado: false,
        ...this.resolveDateFilter(fromValue, toValue),
      },
      order: { fechaRegistro: 'DESC', id: 'DESC' },
      take: this.resolveLimit(limitValue),
    });

    return new StatusResponse(true, 200, 'Bitacora push obtenida', items.map((item) => ({
      id: item.id,
      status: item.status,
      provider: item.provider,
      platform: item.platform,
      format: item.format,
      targetExpression: item.targetExpression,
      title: item.title,
      messagePreview: item.messagePreview,
      providerMessageId: item.providerMessageId,
      idUsuario: item.idUsuario,
      usuarioLogin: item.usuarioLogin,
      detail: item.detail,
      ipRegistro: item.ipRegistro,
      fechaRegistro: item.fechaRegistro,
      payloadJson: item.payloadJson,
    })));
  }

  private async ensureReportesAccess(usuarioId: number): Promise<void> {
    const allowedRole = await this.usuarioRolRepository
      .createQueryBuilder('usuarioRol')
      .innerJoin('usuarioRol.usuario', 'usuario')
      .innerJoin('usuarioRol.rol', 'rol')
      .where('usuario.id = :usuarioId', { usuarioId })
      .andWhere('usuarioRol.activo = :activo', { activo: true })
      .andWhere('usuarioRol.eliminado = :eliminado', { eliminado: false })
      .andWhere('rol.activo = :rolActivo', { rolActivo: true })
      .andWhere('rol.eliminado = :rolEliminado', { rolEliminado: false })
      .andWhere('UPPER(rol.nombre) IN (:...roles)', {
        roles: ReportesService.REPORTS_ROLES,
      })
      .select('usuarioRol.id', 'id')
      .getRawOne();

    if (!allowedRole) {
      throw new ForbiddenException(
        'Solo administradores y soporte pueden acceder a reportes operativos.',
      );
    }
  }

  private resolveLimit(limitValue?: string): number {
    const parsed = Number.parseInt(`${limitValue ?? ''}`.trim(), 10);
    if (!Number.isFinite(parsed)) {
      return 50;
    }

    return Math.min(200, Math.max(10, parsed));
  }

  private resolveDateFilter(
    fromValue?: string,
    toValue?: string,
  ): { fechaRegistro?: FindOperator<Date> } {
    const from = this.parseDateBoundary(fromValue, 'from');
    const to = this.parseDateBoundary(toValue, 'to');

    if (from && to) return { fechaRegistro: Between(from, to) };
    if (from) return { fechaRegistro: MoreThanOrEqual(from) };
    if (to) return { fechaRegistro: LessThanOrEqual(to) };
    return {};
  }

  private parseDateBoundary(
    value: string | undefined,
    boundary: 'from' | 'to',
  ): Date | null {
    const normalized = `${value ?? ''}`.trim();
    if (!normalized) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const [year, month, day] = normalized.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      parsed.setHours(
        boundary === 'from' ? 0 : 23,
        boundary === 'from' ? 0 : 59,
        boundary === 'from' ? 0 : 59,
        boundary === 'from' ? 0 : 999,
      );
      return parsed;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed;
  }
}
