import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { JwtPayload } from './interfaces';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  RegisterExternalUsuarioRequestDto,
  RegisterUsuarioRequestDto,
  LoginRequestDto,
  SessionResponseDto,
  ValidarDniResponseDto,
} from './dto/auth.dto';
import { ReniecExternalResponseDto } from './dto/reniec-external-response.dto';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Permiso } from 'src/security/entities/permiso.entity';
import { UsuarioRol } from 'src/security/entities/usuario-rol.entity';
import { Rol } from 'src/security/entities/rol.entity';
import { Profile } from 'src/security/entities/profile.entity';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { ReniecData } from 'src/security/entities/reniec-data.entity';
import { ProfileValidationStatus } from 'src/security/enums/profile-validation-status.enum';

interface ResolvedReniecIdentity {
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

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
    @InjectRepository(ReniecData)
    private readonly reniecDataRepository: Repository<ReniecData>,
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
      const { profile: profileDto } = registerUsuarioRequestDto;

      const usuarioExistente = await queryRunner.manager.findOne(Usuario, {
        where: { login: registerUsuarioRequestDto.login, activo: true, eliminado: false },
      });
      if (usuarioExistente) {
        throw new BadRequestException('Usted ya cuenta con una cuenta activa, si no recuerda su contraseña porfavor dele clic a olvide mi contraseña');
      }

      const tipoDocumento = await queryRunner.manager.findOne(Multitabla, {
        where: {
          id: profileDto.idTipoDocumentoIdentidad,
          activo: true,
          eliminado: false,
        },
      });
      if (!tipoDocumento) {
        throw new BadRequestException('Tipo de documento no encontrado');
      }

      const documentoIdentidad = profileDto.documentoIdentidad.trim();
      const validacionDocumento = await this.validateDocumento(
        profileDto.idTipoDocumentoIdentidad,
        documentoIdentidad,
        queryRunner.manager,
      );
      if (!validacionDocumento.ok) {
        throw new BadRequestException('Documento erroneo');
      }

      let profileSaved = await queryRunner.manager.findOne(Profile, {
        where: {
          documentoIdentidad,
          tipoDocumento: { id: tipoDocumento.id },
          activo: true,
          eliminado: false,
        },
        relations: ['tipoDocumento'],
      });

      if (profileSaved) {
        const usuarioActivo = await queryRunner.manager.findOne(Usuario, {
          where: {
            profile: { id: profileSaved.id },
            activo: true,
            eliminado: false,
          },
          relations: ['profile'],
        });

        if (usuarioActivo) {
          throw new BadRequestException(
            'Usted ya cuenta con una cuenta activa, si no recuerda su contrasena por favor dele clic a olvide mi contrasena',
          );
        }

        profileSaved.status = this.resolveValidationStatus(
          profileDto.idTipoDocumentoIdentidad,
          profileDto.nombres,
          profileDto.apellidos ?? null,
          validacionDocumento.reniecIdentity ?? null,
        );
        profileSaved.fechaVerificacion =
          profileSaved.status === ProfileValidationStatus.PENDING
            ? null
            : new Date();
        profileSaved.reniecData = validacionDocumento.reniecDataId
          ? ({ id: validacionDocumento.reniecDataId } as ReniecData)
          : null;
        profileSaved.usuarioModificacion = registerUsuarioRequestDto.login;
        profileSaved.ipModificacion = ip;
        profileSaved.fechaModificacion = new Date();
        profileSaved = await queryRunner.manager.save(Profile, profileSaved);
      } else {
        const profile = queryRunner.manager.create(Profile, {
          nombres: profileDto.nombres,
          apellidos: profileDto.apellidos ?? null,
          tipoDocumento,
          documentoIdentidad,
          fechaNacimiento: null,
          status: this.resolveValidationStatus(
            profileDto.idTipoDocumentoIdentidad,
            profileDto.nombres,
            profileDto.apellidos ?? null,
            validacionDocumento.reniecIdentity ?? null,
          ),
          fechaVerificacion:
            profileDto.idTipoDocumentoIdentidad === this.TIPO_DOC_DNI ? new Date() : null,
          reniecData: validacionDocumento.reniecDataId
            ? ({ id: validacionDocumento.reniecDataId } as ReniecData)
            : null,
          usuarioRegistro: registerUsuarioRequestDto.login,
          ipRegistro: ip,
        });
        profileSaved = await queryRunner.manager.save(Profile, profile);
      }

      const usuarioEntity = queryRunner.manager.create(Usuario, {
        login: registerUsuarioRequestDto.login,
        profile: profileSaved,
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

  async validarDni(numeroDocumento: string): Promise<StatusResponse<ValidarDniResponseDto | null>> {
    try {
      const numero = numeroDocumento.trim();
      if (!/^\d{8}$/.test(numero)) {
        return new StatusResponse(false, 400, 'El DNI debe tener 8 digitos', null);
      }

      const reniecIdentity = await this.resolveReniecIdentity(numero);
      if (!reniecIdentity) {
        return new StatusResponse(false, 400, 'No se encontro informacion para el DNI', null);
      }

      return new StatusResponse(true, 200, 'DNI validado', {
        nombres: reniecIdentity.nombres,
        apellidos: reniecIdentity.apellidos,
        idTipoDocumentoIdentidad: this.TIPO_DOC_DNI,
        documentoIdentidad: reniecIdentity.numeroDocumento,
      });
    } catch (_) {
      return new StatusResponse(false, 500, 'Error al validar DNI', null);
    }
  }

  private async validateDocumento(
    idTipoDocumentoIdentidad: number,
    numeroDocumento: string,
    manager?: EntityManager,
  ): Promise<{ ok: boolean; reniecDataId?: number; reniecIdentity?: ResolvedReniecIdentity }> {
    try {
      const numero = numeroDocumento.trim();

      if (idTipoDocumentoIdentidad === this.TIPO_DOC_DNI) {
        const reniecIdentity = await this.resolveReniecIdentity(numero, manager);
        if (!reniecIdentity) {
          return { ok: false };
        }
        const reniecData = await this.findReniecDataByDocumento(this.TIPO_DOC_DNI, numero, manager);
        return {
          ok: reniecIdentity.numeroDocumento === numero,
          reniecDataId: reniecData?.id,
          reniecIdentity,
        };
      }

      const data = await this.fetchDocumentoExterno(
        idTipoDocumentoIdentidad,
        numero,
      );
      if (!data) {
        return { ok: false };
      }

      if (idTipoDocumentoIdentidad === this.TIPO_DOC_RUC) {
        const numeroRespuesta = String(
          data?.numero_documento ?? data?.numeroDocumento ?? data?.ruc ?? '',
        ).trim();
        const estado = String(data?.estado ?? '').trim().toUpperCase();
        return {
          ok: numeroRespuesta === numero && estado === 'ACTIVO',
        };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false };
    }
  }

  async resolveReniecIdentity(
    numeroDocumento: string,
    manager?: EntityManager,
  ): Promise<ResolvedReniecIdentity | null> {
    const numero = numeroDocumento.trim();
    const cached = await this.findReniecDataByDocumento(this.TIPO_DOC_DNI, numero, manager);
    if (cached) {
      return {
        numeroDocumento: cached.numeroDocumento,
        nombres: cached.nombres ?? '',
        apellidos: cached.apellidos ?? '',
        apellidoPaterno: cached.apellidoPaterno ?? '',
        apellidoMaterno: cached.apellidoMaterno ?? '',
      };
    }

    const data = (await this.fetchDocumentoExterno(
      this.TIPO_DOC_DNI,
      numero,
    )) as ReniecExternalResponseDto | null;
    if (!data) {
      return null;
    }

    const numeroRespuesta = String(data?.document_number ?? '').trim();
    if (numeroRespuesta !== numero) {
      return null;
    }

    const nombres = String(data?.first_name ?? '').trim();
    const apellidoPaterno = String(data?.first_last_name ?? '').trim();
    const apellidoMaterno = String(data?.second_last_name ?? '').trim();
    const apellidos = [apellidoPaterno, apellidoMaterno]
      .filter((x) => !!x)
      .join(' ');

    await this.saveReniecData(
      {
        idTipoDocumentoIdentidad: this.TIPO_DOC_DNI,
        numeroDocumento: numeroRespuesta,
        nombres: nombres || null,
        apellidos: apellidos || null,
        apellidoPaterno: apellidoPaterno || null,
        apellidoMaterno: apellidoMaterno || null,
      },
      manager,
    );

    return {
      numeroDocumento: numeroRespuesta,
      nombres,
      apellidos,
      apellidoPaterno,
      apellidoMaterno,
    };
  }

  resolveValidationStatus(
    idTipoDocumentoIdentidad: number,
    nombresProfile: string,
    apellidosProfile: string | null,
    reniecIdentity: ResolvedReniecIdentity | null,
  ): ProfileValidationStatus {
    if (idTipoDocumentoIdentidad !== this.TIPO_DOC_DNI) {
      return ProfileValidationStatus.PENDING;
    }
    if (!reniecIdentity) {
      return ProfileValidationStatus.FAILED;
    }

    const nombrePerfil = this.normalizeText(nombresProfile);
    const apellidoPerfil = this.normalizeText(apellidosProfile ?? '');
    const nombreReniec = this.normalizeText(reniecIdentity.nombres);
    const apellidoReniec = this.normalizeText(reniecIdentity.apellidos);

    if (nombrePerfil === nombreReniec && apellidoPerfil === apellidoReniec) {
      return ProfileValidationStatus.VERIFIED;
    }

    return ProfileValidationStatus.MISMATCH;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private async findReniecDataByDocumento(
    idTipoDocumentoIdentidad: number,
    numeroDocumento: string,
    manager?: EntityManager,
  ): Promise<ReniecData | null> {
    const repository = manager
      ? manager.getRepository(ReniecData)
      : this.reniecDataRepository;
    return repository.findOne({
      where: {
        idTipoDocumentoIdentidad,
        numeroDocumento,
        activo: true,
        eliminado: false,
      },
    });
  }

  private async saveReniecData(
    payload: {
      idTipoDocumentoIdentidad: number;
      numeroDocumento: string;
      nombres: string | null;
      apellidos: string | null;
      apellidoPaterno: string | null;
      apellidoMaterno: string | null;
    },
    manager?: EntityManager,
  ): Promise<ReniecData> {
    const repository = manager
      ? manager.getRepository(ReniecData)
      : this.reniecDataRepository;

    const existing = await repository.findOne({
      where: {
        idTipoDocumentoIdentidad: payload.idTipoDocumentoIdentidad,
        numeroDocumento: payload.numeroDocumento,
      },
    });

    if (existing) {
      existing.nombres = payload.nombres;
      existing.apellidos = payload.apellidos;
      existing.apellidoPaterno = payload.apellidoPaterno;
      existing.apellidoMaterno = payload.apellidoMaterno;
      existing.activo = true;
      existing.eliminado = false;
      return repository.save(existing);
    }

    const created = repository.create({
      ...payload,
    });
    return repository.save(created);
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




