import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { OtpVerificacion } from '../entities/otp-verificacion.entity';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class OtpVerificacionService {
  constructor(
    @InjectRepository(OtpVerificacion)
    private readonly otpRepository: Repository<OtpVerificacion>,
  ) {}

  private getSecret(): string {
    return process.env.OTP_SECRET || 'otp-secret-dev';
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(`${code}:${this.getSecret()}`).digest('hex');
  }

  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  async createOtp(params: {
    usuario: Usuario;
    canal: 'WHATSAPP';
    destino: string;
    ttlMinutes?: number;
    maxAttempts?: number;
  }): Promise<{ otp: OtpVerificacion; plainCode: string }> {
    const ttlMinutes = params.ttlMinutes ?? 10;
    const maxAttempts = params.maxAttempts ?? 5;
    const plainCode = this.generateCode();

    const otp = this.otpRepository.create({
      usuario: params.usuario,
      canal: params.canal,
      destino: params.destino,
      codigoHash: this.hashCode(plainCode),
      fechaExpiracion: new Date(Date.now() + ttlMinutes * 60 * 1000),
      fechaUso: null,
      attempts: 0,
      maxAttempts,
    });

    const saved = await this.otpRepository.save(otp);
    return { otp: saved, plainCode };
  }

  async validateOtp(params: {
    usuarioId: number;
    canal: 'WHATSAPP';
    destino: string;
    code: string;
  }): Promise<OtpVerificacion> {
    const otp = await this.otpRepository.findOne({
      where: {
        usuario: { id: params.usuarioId },
        canal: params.canal,
        destino: params.destino,
        fechaUso: IsNull(),
      },
      relations: ['usuario'],
      order: { id: 'DESC' },
    });

    if (!otp) throw new BadRequestException('No existe OTP activo para ese destino');
    if (otp.fechaExpiracion.getTime() < Date.now()) {
      throw new BadRequestException('El OTP expiro');
    }
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException('OTP bloqueado por intentos fallidos');
    }

    const hash = this.hashCode(params.code);
    if (hash !== otp.codigoHash) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new BadRequestException('Codigo incorrecto');
    }

    otp.fechaUso = new Date();
    await this.otpRepository.save(otp);
    return otp;
  }
}

