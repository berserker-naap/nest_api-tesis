import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { JwtPayload } from './interfaces';
import { Usuario } from 'src/security/entities/usuario.entity';
import { RegisterUsuarioRequestDto, LoginRequestDto } from './dto/auth.dto';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Permiso } from 'src/security/entities/permiso.entity';
import { UsuarioRol } from 'src/security/entities/usuario-rol.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
    private readonly jwtService: JwtService,
  ) { }

  async create(
    registerUsuarioRequestDto: RegisterUsuarioRequestDto,
  ): Promise<StatusResponse<any>> {
    try {
      const { password: passwordDto, ...usuarioData } = registerUsuarioRequestDto;

      const entity = this.usuarioRepository.create({
        ...usuarioData,
        password: bcrypt.hashSync(passwordDto, 10),
      });

      const usuario = await this.usuarioRepository.save(entity);
      if (!usuario)
        throw new InternalServerErrorException('No se pudo crear el usuario');

      delete (usuario as any).password;

      return new StatusResponse(true, 201, 'Registro creado exitosamente', {
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

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async login(loginRequestDto: LoginRequestDto) {
    try {
      const { login, password } = loginRequestDto;

      const usuario = await this.usuarioRepository.findOne({
        where: { login },
        relations: { roles: { rol: true } },
        select: { id: true, login: true, password: true },
      });

      if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
         return new StatusResponse(false, 401, 'Credenciales no válidas', null);
      }

      const roles = usuario.roles.map((r) => r.rol.nombre);
      const usuarioPlano: Partial<Usuario> = { ...usuario };
      delete usuarioPlano.password;

      const permisos = await this.getPermisosUnificadosPorUsuario(usuario.id);

      return new StatusResponse(true, 200, 'Login exitoso', {
        ...usuarioPlano,
        roles,
        permisos,
        token: this.getJwtToken({ id: usuario.id, login: usuario.login }),
      });

    } catch (error) {
      const statusCode = error instanceof HttpException ? error.getStatus() : 500;
      const message = error instanceof HttpException
        ? error.message || error.getResponse()?.['message']
        : 'Error al iniciar sesión';
      return new StatusResponse(false, statusCode, message, null);
    }
  }


  async checkAuthStatus(usuarioRequest: Usuario) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioRequest.id },
      relations: { roles: { rol: true } },
      select: { id: true, login: true },
    });

    if (!usuario) throw new UnauthorizedException('Credenciales no válidas');

    const roles = usuario.roles.map((r) => r.rol.nombre);
    const permisos = await this.getPermisosUnificadosPorUsuario(usuario.id);

    return new StatusResponse(true, 200, 'Actualización de sesión exitosa', {
      id: usuario.id,
      login: usuario.login,
      roles,
      permisos,
      token: this.getJwtToken({ id: usuario.id, login: usuario.login }),
    });
  }


  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  async getPermisosUnificadosPorUsuario(usuarioId: number): Promise<any[]> {
    // Obtener los roles del usuario
    const rolesUsuario = await this.usuarioRolRepository.find({
      where: { usuario: { id: usuarioId } },
      relations: ['rol'],
    });

    const rolesIds = rolesUsuario.map((ur) => ur.rol.id);

    // Obtener permisos de todos los roles
    const permisos = await this.permisoRepository.find({
      where: {
        rol: { id: In(rolesIds) },
        eliminado: false
      },
      relations: ['opcion', 'opcion.modulo', 'accion'],
    });

    // Consolidar permisos
    const permisosMap = new Map<string, { modulo: any; opcion: any; accion: any }>();

    for (const permiso of permisos) {
      const { opcion, accion } = permiso;
      const modulo = opcion.modulo;
      const key = `${modulo.id}-${opcion.id}-${accion.id}`;

      if (!permisosMap.has(key) || permiso.activo) {
        permisosMap.set(key, {
          modulo: { id: modulo.id, nombre: modulo.nombre },
          opcion: {
            id: opcion.id,
            nombre: opcion.nombre,
            path: opcion.path,
            isVisibleNavegacion: opcion.isVisibleNavegacion
          },
          accion: { id: accion.id, nombre: accion.nombre }
        });
      }
    }

    const modulosMap = new Map<number, any>();

    for (const { modulo, opcion, accion } of permisosMap.values()) {
      if (!modulosMap.has(modulo.id)) {
        modulosMap.set(modulo.id, {
          id: modulo.id,
          nombre: modulo.nombre,
          opciones: new Map()
        });
      }

      const moduloData = modulosMap.get(modulo.id);

      if (!moduloData.opciones.has(opcion.id)) {
        moduloData.opciones.set(opcion.id, {
          id: opcion.id,
          nombre: opcion.nombre,
          path: opcion.path,
          isVisibleNavegacion: opcion.isVisibleNavegacion,
          acciones: []
        });
      }

      const opcionData = moduloData.opciones.get(opcion.id);
      if (!opcionData.acciones.find((a: any) => a.id === accion.id)) {
        opcionData.acciones.push(accion);
      }
    }

    return Array.from(modulosMap.values()).map((modulo: any) => ({
      nombre: modulo.nombre,
      opciones: Array.from(modulo.opciones.values()).map((opcion: any) => ({
        nombre: opcion.nombre,
        path: opcion.path,
        isVisibleNavegacion: opcion.isVisibleNavegacion,
        acciones: opcion.acciones.map((accion: any) => ({
          nombre: accion.nombre
        }))
      }))
    }));
  }

}
