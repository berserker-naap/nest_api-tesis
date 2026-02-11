import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { IsNull, Repository } from 'typeorm';
import {
  ConfirmWhatsappLinkDto,
  RequestWhatsappLinkDto,
} from '../dto/whatsapp-link.dto';
import { OtpVerificacion } from '../entities/otp-verificacion.entity';
import { UsuarioCanal } from '../entities/usuario-canal.entity';
import { Usuario } from '../entities/usuario.entity';
import { OtpVerificacionService } from './otp-verificacion.service';

@Injectable()
export class WhatsappLinkService {
  constructor(
    @InjectRepository(UsuarioCanal)
    private readonly usuarioCanalRepository: Repository<UsuarioCanal>,
    @InjectRepository(OtpVerificacion)
    private readonly otpRepository: Repository<OtpVerificacion>,
    private readonly otpService: OtpVerificacionService,
  ) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      if (!/^\+\d{8,15}$/.test(cleaned)) {
        throw new BadRequestException('Telefono invalido, formato E.164 requerido');
      }
      return cleaned;
    }

    const onlyDigits = cleaned.replace(/\D/g, '');
    const normalized = onlyDigits.startsWith('51') ? `+${onlyDigits}` : `+51${onlyDigits}`;
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new BadRequestException('Telefono invalido, formato E.164 requerido');
    }
    return normalized;
  }

  async requestLink(
    dto: RequestWhatsappLinkDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const phone = this.normalizePhone(dto.phone);
      const destino = dto.via === 'EMAIL' ? dto.emailDestino : phone;

      if (!destino) {
        throw new BadRequestException('Destino requerido para el canal seleccionado');
      }

      const linkedInOtherUser = await this.usuarioCanalRepository.findOne({
        where: {
          canal: 'WHATSAPP',
          identificador: phone,
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });

      if (linkedInOtherUser && linkedInOtherUser.usuario.id !== usuario.id) {
        throw new BadRequestException('Ese numero ya esta vinculado a otro usuario');
      }

      let canal = await this.usuarioCanalRepository.findOne({
        where: {
          usuario: { id: usuario.id },
          canal: 'WHATSAPP',
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });

      if (!canal) {
        canal = this.usuarioCanalRepository.create({
          usuario,
          canal: 'WHATSAPP',
          identificador: phone,
          verificado: false,
          fechaVerificacion: null,
          usuarioRegistro: usuario.login,
          ipRegistro: ip,
        });
      } else {
        canal.identificador = phone;
        canal.verificado = false;
        canal.fechaVerificacion = null;
        canal.usuarioModificacion = usuario.login;
        canal.ipModificacion = ip;
        canal.fechaModificacion = new Date();
      }

      await this.usuarioCanalRepository.save(canal);

      const { plainCode } = await this.otpService.createOtp({
        usuario,
        canal: dto.via,
        destino,
      });

      console.log(`OTP ${dto.via} para ${destino}: ${plainCode}`);

      return new StatusResponse(true, 200, 'Codigo enviado', null);
    } catch (error) {
      console.error('Error al solicitar enlace WhatsApp:', error);
      return new StatusResponse(
        false,
        500,
        'Error al solicitar enlace WhatsApp',
        error,
      );
    }
  }

  async confirmLink(
    dto: ConfirmWhatsappLinkDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const phone = this.normalizePhone(dto.phone);

      const otp = await this.otpRepository.findOne({
        where: {
          usuario: { id: usuario.id },
          usedAt: IsNull(),
        },
        relations: ['usuario'],
        order: { id: 'DESC' },
      });

      if (!otp) {
        throw new NotFoundException('No hay OTP pendiente para confirmar');
      }

      await this.otpService.validateOtp({
        usuarioId: usuario.id,
        canal: otp.canal,
        destino: otp.destino,
        code: dto.code,
      });

      const canal = await this.usuarioCanalRepository.findOne({
        where: {
          usuario: { id: usuario.id },
          canal: 'WHATSAPP',
          identificador: phone,
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });

      if (!canal) {
        throw new NotFoundException('No existe solicitud de enlace para ese numero');
      }

      canal.verificado = true;
      canal.fechaVerificacion = new Date();
      canal.usuarioModificacion = usuario.login;
      canal.ipModificacion = ip;
      canal.fechaModificacion = new Date();
      await this.usuarioCanalRepository.save(canal);

      return new StatusResponse(
        true,
        200,
        'WhatsApp enlazado correctamente',
        null,
      );
    } catch (error) {
      console.error('Error al confirmar enlace WhatsApp:', error);
      return new StatusResponse(
        false,
        500,
        'Error al confirmar enlace WhatsApp',
        error,
      );
    }
  }

  async unlink(usuario: Usuario, ip: string): Promise<StatusResponse<any>> {
    try {
      const canal = await this.usuarioCanalRepository.findOne({
        where: {
          usuario: { id: usuario.id },
          canal: 'WHATSAPP',
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });

      if (!canal) {
        throw new NotFoundException('No existe WhatsApp vinculado');
      }

      canal.verificado = false;
      canal.activo = false;
      canal.eliminado = true;
      canal.fechaEliminacion = new Date();
      canal.usuarioEliminacion = usuario.login;
      canal.ipEliminacion = ip;
      await this.usuarioCanalRepository.save(canal);

      return new StatusResponse(true, 200, 'WhatsApp desvinculado', null);
    } catch (error) {
      console.error('Error al desvincular WhatsApp:', error);
      return new StatusResponse(false, 500, 'Error al desvincular WhatsApp', error);
    }
  }

  async findVerifiedUserByWhatsapp(phone: string): Promise<Usuario | null> {
    const normalized = this.normalizePhone(phone);
    const canal = await this.usuarioCanalRepository.findOne({
      where: {
        canal: 'WHATSAPP',
        identificador: normalized,
        verificado: true,
        activo: true,
        eliminado: false,
      },
      relations: ['usuario'],
    });
    return canal?.usuario ?? null;
  }
}
