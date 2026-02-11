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
    canal: 'SMS' | 'EMAIL';
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
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      usedAt: null,
      attempts: 0,
      maxAttempts,
    });

    const saved = await this.otpRepository.save(otp);
    return { otp: saved, plainCode };
  }

  async validateOtp(params: {
    usuarioId: number;
    canal: 'SMS' | 'EMAIL';
    destino: string;
    code: string;
  }): Promise<OtpVerificacion> {
    const otp = await this.otpRepository.findOne({
      where: {
        usuario: { id: params.usuarioId },
        canal: params.canal,
        destino: params.destino,
        usedAt: IsNull(),
      },
      relations: ['usuario'],
      order: { id: 'DESC' },
    });

    if (!otp) throw new BadRequestException('No existe OTP activo para ese destino');
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El OTP expiró');
    }
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException('OTP bloqueado por intentos fallidos');
    }

    const hash = this.hashCode(params.code);
    if (hash !== otp.codigoHash) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new BadRequestException('Código OTP incorrecto');
    }

    otp.usedAt = new Date();
    await this.otpRepository.save(otp);
    return otp;
  }
}
