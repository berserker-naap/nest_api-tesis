import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { JwtPayload } from './interfaces';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  RegisterExternalUsuarioRequestDto,
  RegisterUsuarioRequestDto,
  LoginRequestDto,
  SessionResponseDto,
} from './dto/auth.dto';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Permiso } from 'src/security/entities/permiso.entity';
import { UsuarioRol } from 'src/security/entities/usuario-rol.entity';
import { Rol } from 'src/security/entities/rol.entity';
import { Persona } from 'src/security/entities/persona.entity';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';

@Injectable()
export class AuthService {
  private readonly TIPO_DOC_DNI = 3;
  private readonly TIPO_DOC_RUC = 4;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) { }


  async create(
    registerUsuarioRequestDto: RegisterUsuarioRequestDto,
    ip: string,
  ): Promise<StatusResponse<SessionResponseDto | null>> {
    try {
      const { password: passwordDto, ...usuarioData } = registerUsuarioRequestDto;

      const entity = this.usuarioRepository.create({
        ...usuarioData,
        password: bcrypt.hashSync(passwordDto, 10),
      });

      const usuario = await this.usuarioRepository.save(entity);
      if (!usuario)
        throw new InternalServerErrorException('No se pudo crear el usuario');

      const session = await this.buildSessionPayload(usuario.id, usuario.login);

      return new StatusResponse(true, 201, 'Registro creado exitosamente', session);
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

  async createExternal(
    registerUsuarioRequestDto: RegisterExternalUsuarioRequestDto,
    ip: string,
  ): Promise<StatusResponse<SessionResponseDto | null>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { persona: personaDto } = registerUsuarioRequestDto;

      const usuarioExistente = await queryRunner.manager.findOne(Usuario, {
        where: { login: registerUsuarioRequestDto.login },
      });
      if (usuarioExistente) {
        throw new BadRequestException('Usted ya cuenta con una cuenta activa, si no recuerda su contraseña porfavor dele clic a olvide mi contraseña');
      }

      const tipoDocumento = await queryRunner.manager.findOne(Multitabla, {
        where: {
          id: personaDto.idTipoDocumentoIdentidad,
          activo: true,
          eliminado: false,
        },
      });
      if (!tipoDocumento) {
        throw new BadRequestException('Tipo de documento no encontrado');
      }

      const documentoIdentidad = personaDto.documentoIdentidad.trim();
      const validacionDocumento = await this.validateDocumento(
        personaDto.idTipoDocumentoIdentidad,
        documentoIdentidad,
      );
      if (!validacionDocumento.ok) {
        throw new BadRequestException('Documento erroneo');
      }

      let personaSaved = await queryRunner.manager.findOne(Persona, {
        where: {
          documentoIdentidad,
          tipoDocumento: { id: tipoDocumento.id },
          activo: true,
          eliminado: false,
        },
        relations: ['tipoDocumento'],
      });

      if (personaSaved) {
        const usuarioActivo = await queryRunner.manager.findOne(Usuario, {
          where: {
            persona: { id: personaSaved.id },
            activo: true,
            eliminado: false,
          },
          relations: ['persona'],
        });

        if (usuarioActivo) {
          throw new BadRequestException(
            'Usted ya cuenta con una cuenta activa, si no recuerda su contraseña porfavor dele clic a olvide mi contraseña',
          );
        }
      } else {
        const persona = queryRunner.manager.create(Persona, {
          nombre: personaDto.nombre,
          apellido: personaDto.apellido ?? null,
          tipoDocumento,
          documentoIdentidad,
          fechaNacimiento: null,
          usuarioRegistro: registerUsuarioRequestDto.login,
          ipRegistro: ip,
        });
        personaSaved = await queryRunner.manager.save(Persona, persona);
      }

      const usuarioEntity = queryRunner.manager.create(Usuario, {
        login: registerUsuarioRequestDto.login,
        persona: personaSaved,
        usuarioRegistro: registerUsuarioRequestDto.login,
        ipRegistro: ip,
        password: bcrypt.hashSync(registerUsuarioRequestDto.password, 10),
      });
      const usuario = await queryRunner.manager.save(Usuario, usuarioEntity);

      const rolCliente = await queryRunner.manager.findOne(Rol, {
        where: {
          id: 2,
          activo: true,
          eliminado: false,
        },
      });

      if (!rolCliente) {
        throw new BadRequestException(
          `No existe el rol cliente`,
        );
      }

      const usuarioRol = queryRunner.manager.create(UsuarioRol, {
        usuario,
        rol: rolCliente,
        usuarioRegistro: registerUsuarioRequestDto.login,
        ipRegistro: ip,
      });
      await queryRunner.manager.save(UsuarioRol, usuarioRol);


      await queryRunner.commitTransaction();

      const session = await this.buildSessionPayload(usuario.id, usuario.login);
      return new StatusResponse(true, 201, 'Registro creado exitosamente', session);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const statusCode =
        error instanceof HttpException ? error.getStatus() : 500;
      const message =
        error instanceof HttpException
          ? error.message || error.getResponse()?.['message']
          : 'Error al registrar usuario';
      return new StatusResponse(false, statusCode, message, null);
    } finally {
      await queryRunner.release();
    }
  }

  async validarDni(numeroDocumento: string): Promise<StatusResponse<any>> {
    try {
      const numero = numeroDocumento.trim();
      if (!/^\d{8}$/.test(numero)) {
        return new StatusResponse(false, 400, 'El DNI debe tener 8 digitos', null);
      }

      const data = await this.fetchDocumentoExterno(this.TIPO_DOC_DNI, numero);
      if (!data) {
        return new StatusResponse(false, 400, 'No se encontro informacion para el DNI', null);
      }

      const numeroRespuesta = String(data?.document_number ?? '').trim();
      if (numeroRespuesta !== numero) {
        return new StatusResponse(false, 400, 'Documento erroneo', null);
      }

      const nombres = String(data?.first_name ?? data?.nombres ?? '').trim();
      const apellidoPaterno = String(data?.first_last_name ?? data?.apellido_paterno ?? '').trim();
      const apellidoMaterno = String(data?.second_last_name ?? data?.apellido_materno ?? '').trim();
      const apellidos = [apellidoPaterno, apellidoMaterno]
        .filter((x) => !!x)
        .join(' ');

      return new StatusResponse(true, 200, 'DNI validado', {
        numeroDocumento: numeroRespuesta,
        nombres,
        apellidos,
        apellidoPaterno,
        apellidoMaterno,
      });
    } catch (_) {
      return new StatusResponse(false, 500, 'Error al validar DNI', null);
    }
  }

  private async validateDocumento(
    idTipoDocumentoIdentidad: number,
    numeroDocumento: string,
  ): Promise<{ ok: boolean }> {
    try {
      const data = await this.fetchDocumentoExterno(
        idTipoDocumentoIdentidad,
        numeroDocumento,
      );
      if (!data) {
        return { ok: false };
      }

      if (idTipoDocumentoIdentidad === this.TIPO_DOC_DNI) {
        const numeroRespuesta = String(data?.document_number ?? '').trim();
        return { ok: numeroRespuesta === numeroDocumento };
      }

      if (idTipoDocumentoIdentidad === this.TIPO_DOC_RUC) {
        const numeroRespuesta = String(
          data?.numero_documento ?? data?.numeroDocumento ?? data?.ruc ?? '',
        ).trim();
        const estado = String(data?.estado ?? '').trim().toUpperCase();
        return {
          ok: numeroRespuesta === numeroDocumento && estado === 'ACTIVO',
        };
      }

      return { ok: false };
    } catch (error) {
      return { ok: false };
    }
  }

  private async fetchDocumentoExterno(
    idTipoDocumentoIdentidad: number,
    numeroDocumento: string,
  ): Promise<Record<string, any> | null> {
    const apiKey = process.env.DECOLECTA_API_KEY || 'sk_13282.jT3rl2hFseTS9MjrCBHjUReRIuqklcRD';
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    let endpoint: string;
    if (idTipoDocumentoIdentidad === this.TIPO_DOC_DNI) {
      endpoint = `https://api.decolecta.com/v1/reniec/dni?numero=${encodeURIComponent(numeroDocumento)}`;
    } else if (idTipoDocumentoIdentidad === this.TIPO_DOC_RUC) {
      endpoint = `https://api.decolecta.com/v1/sunat/ruc?numero=${encodeURIComponent(numeroDocumento)}`;
    } else {
      return null;
    }

    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<string, any>;
  }

  async login(loginRequestDto: LoginRequestDto): Promise<StatusResponse<SessionResponseDto | null>> {
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

      const session = await this.buildSessionPayload(usuario.id, usuario.login);
      return new StatusResponse(true, 200, 'Login exitoso', session);
    } catch (error) {
      const statusCode = error instanceof HttpException ? error.getStatus() : 500;
      const message = error instanceof HttpException
        ? error.message || error.getResponse()?.['message']
        : 'Error al iniciar sesión';
      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async checkAuthStatus(usuarioRequest: Usuario): Promise<StatusResponse<SessionResponseDto | null>> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioRequest.id },
      relations: { roles: { rol: true } },
      select: { id: true, login: true },
    });

    if (!usuario) throw new UnauthorizedException('Credenciales no válidas');

    const session = await this.buildSessionPayload(usuario.id, usuario.login);
    return new StatusResponse(true, 200, 'Actualización de sesión exitosa', session);
  }

  async buildSessionPayload(usuarioId: number, login: string): Promise<SessionResponseDto> {
    const usuarioConRoles = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
      relations: { roles: { rol: true } },
      select: { id: true },
    });

    const roles = (usuarioConRoles?.roles ?? []).map((r) => r.rol.nombre);
    const permisos = await this.getPermisosUnificadosPorUsuario(usuarioId);

    return {
      login,
      roles,
      permisos,
      token: this.getJwtToken({ id: usuarioId, login }),
    };
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
