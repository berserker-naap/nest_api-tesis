import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponse } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Persona } from "../entities/persona.entity";
import { Multitabla } from "src/businessparam/entities/multitabla.entity";
import { CreateUpdatePersonaDto } from "../dto/persona.dto";

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const personas = await this.personaRepository.find({
        where: {
          activo: true,
          eliminado: false
        },
        relations: ['tipoDocumento']
      });

      // Solo exponer valor y nombre de tipoDocumento
      const personasConTipoDoc = personas.map(p => ({
        ...p,
        tipoDocumento: p.tipoDocumento ? {
          idTipoDocumentoIdentidad: p.tipoDocumento.id,
          nombre: p.tipoDocumento.nombre,
          valor: p.tipoDocumento.valor
        } : null
      }));

      return new StatusResponse(true, 200, 'Personas obtenidas', personasConTipoDoc);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener personas', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id, activo: true, eliminado: false }, relations: ['tipoDocumento'] });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      // Solo exponer valor y nombre de tipoDocumento
      const personaConTipoDoc = {
        ...persona,
        tipoDocumento: persona.tipoDocumento ? {
          idTipoDocumentoIdentidad: persona.tipoDocumento.id,
          nombre: persona.tipoDocumento.nombre,
          valor: persona.tipoDocumento.valor
        } : null
      };

      return new StatusResponse(true, 200, 'Persona encontrada', personaConTipoDoc);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdatePersonaDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      // Buscar el tipo de documento usando el repositorio de Multitabla
      const tipoDocumento = await this.multitablaRepository.findOne({ where: { id: dto.idTipoDocumentoIdentidad, activo: true, eliminado: false } });
      if (!tipoDocumento) {
        return new StatusResponse(false, 400, 'Tipo de documento no encontrado', null);
      }

      const persona = this.personaRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        tipoDocumento: tipoDocumento,
        ipRegistro: ip,
      });
      const saved = await this.personaRepository.save(persona);

      // Estructura de respuesta igual que findAll
      const personaConTipoDoc = {
        ...saved,
        tipoDocumento: saved.tipoDocumento ? {
          idTipoDocumentoIdentidad: saved.tipoDocumento.id,
          nombre: saved.tipoDocumento.nombre,
          valor: saved.tipoDocumento.valor
        } : null
      };

      return new StatusResponse(true, 201, 'Persona creada', personaConTipoDoc);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear persona', error);
    }
  }


  async update(id: number, dto: CreateUpdatePersonaDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      // Buscar el tipo de documento usando el repositorio de Multitabla
      const tipoDocumento = await this.multitablaRepository.findOne({ where: { id: dto.idTipoDocumentoIdentidad, activo: true, eliminado: false } });
      if (!tipoDocumento) {
        return new StatusResponse(false, 400, 'Tipo de documento no encontrado', null);
      }

      // Actualizar los campos
      persona.nombre = dto.nombre ?? '';
      persona.apellido = dto.apellido ?? '';
      persona.documentoIdentidad = dto.documentoIdentidad ?? '';
      persona.fechaNacimiento = dto.fechaNacimiento ?? null;
      persona.tipoDocumento = tipoDocumento;
      persona.usuarioModificacion = usuario;
      persona.ipModificacion = ip;
      persona.fechaModificacion = new Date();

      const updated = await this.personaRepository.save(persona);

      // Solo exponer valor y nombre de tipoDocumento
      const personaConTipoDoc = {
        ...updated,
        tipoDocumento: updated.tipoDocumento ? {
          idTipoDocumentoIdentidad: updated.tipoDocumento.id,
          nombre: updated.tipoDocumento.nombre,
          valor: updated.tipoDocumento.valor
        } : null
      };

      return new StatusResponse(true, 200, 'Persona actualizada', personaConTipoDoc);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al actualizar persona', error);
    }
  }

  async delete(id: number, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!persona) {
        return new StatusResponse(false, 404, 'Persona no encontrada', null);
      }

      persona.usuarioEliminacion = usuario;
      persona.ipEliminacion = ip;
      persona.activo = false;
      persona.eliminado = true;
      persona.fechaEliminacion = new Date();

      await this.personaRepository.save(persona);

      return new StatusResponse(true, 200, 'Persona eliminada', null);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar persona', error);
    }
  }

  async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const personas = await this.personaRepository.findBy({ id: In(ids) });

      if (!personas.length) {
        return new StatusResponse(false, 404, 'No se encontraron personas para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = personas.map((persona) => {
        persona.usuarioEliminacion = usuario;
        persona.ipEliminacion = ip;
        persona.activo = false;
        persona.eliminado = true;
        persona.fechaEliminacion = new Date();
        return persona;
      });

      // Guaardamos los cambios de auditoría
      await this.personaRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Personas eliminadas', ids);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar múltiples personas', error);
    }
  }

}
