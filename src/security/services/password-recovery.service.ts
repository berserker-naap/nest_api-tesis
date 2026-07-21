import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { StatusResponse } from 'src/common/dto/response.dto';
import { normalizeLogin } from 'src/common/utils/login.util';
import { MessagingMailService } from 'src/messaging/services/messaging-mail.service';
import { Repository } from 'typeorm';
import {
  RequestPasswordRecoveryDto,
  ResetPasswordRecoveryDto,
  VerifyPasswordRecoveryDto,
} from '../dto/password-recovery.dto';
import { Usuario } from '../entities/usuario.entity';
import { OtpVerificacionService } from './otp-verificacion.service';

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly otpVerificacionService: OtpVerificacionService,
    private readonly messagingMailService: MessagingMailService,
  ) {}

  async requestRecovery(
    dto: RequestPasswordRecoveryDto,
    ip: string,
  ): Promise<StatusResponse<{ sent: boolean } | null>> {
    try {
      const login = normalizeLogin(dto.login);
      const usuario = await this.usuarioRepository.findOne({
        where: {
          login,
          activo: true,
          eliminado: false,
        },
        relations: ['profile'],
      });

      if (!usuario) {
        return new StatusResponse(
          true,
          200,
          'Si la cuenta existe, enviaremos un código al correo registrado',
          { sent: false },
        );
      }

      const { plainCode } = await this.otpVerificacionService.createOtp({
        usuario,
        canal: 'EMAIL',
        destino: login,
      });

      const nombre =
        usuario.profile?.nombres?.trim() || usuario.login || 'Usuario';
      const mailResult = await this.messagingMailService.sendTemplate(
        {
          to: [login],
          templateCode: 'PASSWORD_RESET',
          variables: {
            nombre,
            resetCode: plainCode,
          },
        },
        usuario,
        ip,
      );

      if (!mailResult.ok) {
        throw new InternalServerErrorException(
          this.extractMessage(mailResult.message),
        );
      }

      return new StatusResponse(
        true,
        200,
        'Si la cuenta existe, enviaremos un código al correo registrado',
        { sent: true },
      );
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.message
          : 'No se pudo enviar el correo de recuperacion';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async verifyCode(
    dto: VerifyPasswordRecoveryDto,
  ): Promise<StatusResponse<null>> {
    try {
      const login = normalizeLogin(dto.login);
      const usuario = await this.usuarioRepository.findOne({
        where: {
          login,
          activo: true,
          eliminado: false,
        },
      });

      if (!usuario) {
        throw new BadRequestException('Solicitud de recuperacion invalida');
      }

      await this.otpVerificacionService.validateOtp({
        usuarioId: usuario.id,
        canal: 'EMAIL',
        destino: login,
        code: dto.code.trim(),
        consume: false,
      });

      return new StatusResponse(true, 200, 'Código validado correctamente', null);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.message
          : 'No se pudo validar el código';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async resetPassword(
    dto: ResetPasswordRecoveryDto,
    ip: string,
  ): Promise<StatusResponse<null>> {
    try {
      const login = normalizeLogin(dto.login);
      const usuario = await this.usuarioRepository.findOne({
        where: {
          login,
          activo: true,
          eliminado: false,
        },
      });

      if (!usuario) {
        throw new BadRequestException('Solicitud de recuperacion invalida');
      }

      await this.otpVerificacionService.validateOtp({
        usuarioId: usuario.id,
        canal: 'EMAIL',
        destino: login,
        code: dto.code.trim(),
        consume: true,
      });

      usuario.password = bcrypt.hashSync(dto.password, 10);
      usuario.usuarioModificacion = usuario.login;
      usuario.ipModificacion = ip;
      usuario.fechaModificacion = new Date();
      await this.usuarioRepository.save(usuario);

      return new StatusResponse(
        true,
        200,
        'Contraseña actualizada correctamente',
        null,
      );
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
          ? error.message
          : 'No se pudo restablecer la contraseña';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  private extractMessage(message: string | string[]): string {
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
