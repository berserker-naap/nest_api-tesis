import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import {
  CreateProfileDto,
  UpdateProfileDto,
  ProfileResponseDto,
  ProfileTipoDocumentoResponseDto,
} from '../dto/persona.dto';

@Injectable()
export class ProfileCatalogService {
  constructor(
    @InjectRepository(Profile)
    private readonly personaRepository: Repository<Profile>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
  ) {}

  async findAll(): Promise<StatusResponse<ProfileResponseDto[] | any>> {
    try {
      const personas = await this.personaRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        relations: ['tipoDocumento'],
      });

      const personasDto: ProfileResponseDto[] = personas.map((p) => ({
        id: p.id,
        nombres: p.nombres,
        apellidos: p.apellidos ?? null,
        documentoIdentidad: p.documentoIdentidad ?? null,
        fechaNacimiento: p.fechaNacimiento ?? null,
        tipoDocumento: p.tipoDocumento
          ? {
              id: p.tipoDocumento.id,
              nombre: p.tipoDocumento.nombre,
              valor: p.tipoDocumento.valor ?? null,
            }
          : null,
      }));

      return new StatusResponse(
        true,
        200,
        'Personas obtenidas',
        personasDto,
      );
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener personas', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<ProfileResponseDto | any>> {
    try {
      const persona = await this.personaRepository.findOne({
        where: { id, activo: true, eliminado: false },
        relations: ['tipoDocumento'],
      });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      const personaDto: ProfileResponseDto = {
        id: persona.id,
        nombres: persona.nombres,
        apellidos: persona.apellidos ?? null,
        documentoIdentidad: persona.documentoIdentidad ?? null,
        fechaNacimiento: persona.fechaNacimiento ?? null,
        tipoDocumento: persona.tipoDocumento
          ? {
              id: persona.tipoDocumento.id,
              nombre: persona.tipoDocumento.nombre,
              valor: persona.tipoDocumento.valor ?? null,
            }
          : null,
      };

      return new StatusResponse(
        true,
        200,
        'Persona encontrada',
        personaDto,
      );
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener persona', error);
    }
  }

  async create(
    dto: CreateProfileDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<ProfileResponseDto | any>> {
    try {
      // Buscar el tipo de documento usando el repositorio de Multitabla
      const tipoDocumento = await this.multitablaRepository.findOne({
        where: {
          id: dto.idTipoDocumentoIdentidad,
          activo: true,
          eliminado: false,
        },
      });
      if (!tipoDocumento) {
        return new StatusResponse(
          false,
          400,
          'Tipo de documento no encontrado',
          null,
        );
      }

      const persona = this.personaRepository.create({
        nombres: dto.nombres,
        apellidos: dto.apellidos ?? null,
        documentoIdentidad: dto.documentoIdentidad ?? null,
        fechaNacimiento: dto.fechaNacimiento ?? null,
        usuarioRegistro: usuario,
        tipoDocumento: tipoDocumento,
        ipRegistro: ip,
      });
      const saved = await this.personaRepository.save(persona);

      const personaDto: ProfileResponseDto = {
        id: saved.id,
        nombres: saved.nombres,
        apellidos: saved.apellidos ?? null,
        documentoIdentidad: saved.documentoIdentidad ?? null,
        fechaNacimiento: saved.fechaNacimiento ?? null,
        tipoDocumento: {
          id: tipoDocumento.id,
          nombre: tipoDocumento.nombre,
          valor: tipoDocumento.valor,
        },
      };

      return new StatusResponse(true, 201, 'Persona creada', personaDto);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear persona', error);
    }
  }

  async update(
    id: number,
    dto: UpdateProfileDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<ProfileResponseDto | any>> {
    try {
      const persona = await this.personaRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      // Buscar el tipo de documento usando el repositorio de Multitabla
      const tipoDocumento = await this.multitablaRepository.findOne({
        where: {
          id: dto.idTipoDocumentoIdentidad,
          activo: true,
          eliminado: false,
        },
      });
      if (!tipoDocumento) {
        return new StatusResponse(
          false,
          400,
          'Tipo de documento no encontrado',
          null,
        );
      }

      // Actualizar los campos
      persona.nombres = dto.nombres ?? '';
      persona.apellidos = dto.apellidos ?? null;
      persona.documentoIdentidad = dto.documentoIdentidad ?? null;
      persona.fechaNacimiento = dto.fechaNacimiento ?? null;
      persona.tipoDocumento = tipoDocumento;
      persona.usuarioModificacion = usuario;
      persona.ipModificacion = ip;
      persona.fechaModificacion = new Date();

      const updated = await this.personaRepository.save(persona);

      const personaDto: ProfileResponseDto = {
        id: updated.id,
        nombres: updated.nombres,
        apellidos: updated.apellidos ?? null,
        documentoIdentidad: updated.documentoIdentidad ?? null,
        fechaNacimiento: updated.fechaNacimiento ?? null,
        tipoDocumento: {
          id: tipoDocumento.id,
          nombre: tipoDocumento.nombre,
          valor: tipoDocumento.valor,
        },
      };

      return new StatusResponse(
        true,
        200,
        'Persona actualizada',
        personaDto,
      );
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al actualizar persona',
        error,
      );
    }
  }

  async delete(
    id: number,
    usuarioEliminacion: string,
    ipEliminacion: string,
  ): Promise<StatusResponse<any>> {
    try {
      const persona = await this.personaRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      persona.usuarioEliminacion = usuarioEliminacion;
      persona.ipEliminacion = ipEliminacion;
      persona.activo = false;
      persona.eliminado = true;
      persona.fechaEliminacion = new Date();

      await this.personaRepository.save(persona);

      return new StatusResponse(true, 200, 'Persona eliminada', null);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar persona', error);
    }
  }

  async deleteMany(
    ids: number[],
    usuarioEliminacion: string,
    ipEliminacion: string,
  ): Promise<StatusResponse<any>> {
    try {
      const personas = await this.personaRepository.findBy({
        id: In(ids),
        activo: true,
        eliminado: false,
      });

      if (!personas.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron personas para eliminar',
          null,
        );
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = personas.map((persona) => {
        persona.usuarioEliminacion = usuarioEliminacion;
        persona.ipEliminacion = ipEliminacion;
        persona.activo = false;
        persona.eliminado = true;
        persona.fechaEliminacion = new Date();
        return persona;
      });

      // Guaardamos los cambios de auditoría
      await this.personaRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Personas eliminadas', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples personas',
        error,
      );
    }
  }
}


