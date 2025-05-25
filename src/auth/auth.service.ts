import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { JwtPayload } from './interfaces';
import { Usuario } from 'src/security/entities/usuario.entity';
import { RegisterUsuarioDto, LoginDto } from './dto/auth.dto';
import { StatusResponseDto } from 'src/common/dto/response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) { }

  async create(
    registerUsuarioDto: RegisterUsuarioDto,
  ): Promise<StatusResponseDto<any>> {
    try {
      const { password: passwordDto, ...usuarioData } = registerUsuarioDto;

      const entity = this.usuarioRepository.create({
        ...usuarioData,
        password: bcrypt.hashSync(passwordDto, 10),
      });

      const usuario = await this.usuarioRepository.save(entity);
      if (!usuario)
        throw new InternalServerErrorException('No se pudo crear el usuario');

      delete (usuario as any).password;

      return new StatusResponseDto(true, 201, 'Registro creado exitosamente', {
        ...usuario,
        token: this.getJwtToken({ id: usuario.id, login: usuario.login }),
      });
    } catch (error) {
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;

      const message =
        error instanceof HttpException
          ? error.message || error.getResponse()?.['message']
          : 'Error al registrar usuario';

      return new StatusResponseDto(false, statusCode, message, null);
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { password, login } = loginDto;

      const usuario = await this.usuarioRepository.findOne({
        where: { login },
        relations: {
          roles: {
            rol: true,
          },
        },
        select: {
          id: true,
          login: true,
          password: true,
        },
      });

      if (!usuario || !bcrypt.compareSync(password, usuario.password))
        throw new UnauthorizedException('Credenciales no válidas');
      const roles = usuario.roles.map((r) => r.rol.nombre);
      const usuarioPlano: Partial<Usuario> = { ...usuario };
      delete usuarioPlano.password;

      return new StatusResponseDto(true, 200, 'Login exitosamente', {
        ...usuarioPlano,
        roles,
        token: this.getJwtToken({ id: usuario.id, login: usuario.login }),
      });
    } catch (error) {
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;

      const message =
        error instanceof HttpException
          ? error.message || error.getResponse()?.['message']
          : 'Error al iniciar sesion';

      return new StatusResponseDto(false, statusCode, message, null);
    }
  }

  async checkAuthStatus(usuarioRequest: Usuario) {
    //EL AUTH YA VALIDA QUE ES UN USUARIO VALIDO,
    //SIMPLEMNMTE RECARGAMOS UN JWT CON UNA FECHA DE EXPIRACION ACTUALIZADA.

    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioRequest?.id },
      relations: {
        roles: {
          rol: true,
        },
      },
      select: {
        id: true,
        login: true,
      },
    });

    if (!usuario) throw new UnauthorizedException('Credenciales no válidas');
    const roles = usuario.roles.map((r) => r.rol.nombre);
    const usuarioPlano: Partial<Usuario> = { ...usuario };
    return new StatusResponseDto(true, 200, 'Actualizacion de sesion exitoso', {
      ...usuarioPlano,
      roles,
      token: this.getJwtToken({ id: usuario.id, login: usuario.login }),
    });
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
