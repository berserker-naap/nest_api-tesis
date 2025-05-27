import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponseDto } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Persona } from "../entities/persona.entity";
import { CreateUpdatePersonaDto } from "../dto/persona.dto";

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>
  ) { }

  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const personas = await this.personaRepository.find();
      return new StatusResponseDto(true, 200, 'Personas obtenidas', personas);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener personas', error);
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id } });
      if (!persona) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }
      return new StatusResponseDto(true, 200, 'Opción encontrada', persona);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdatePersonaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const persona = this.personaRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.personaRepository.save(persona);
      return new StatusResponseDto(true, 201, 'Persona creada', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear persona', error);
    }
  }


  async update(id: number, dto: CreateUpdatePersonaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id } });
      if (!persona) {
        return new StatusResponseDto(false, 404, 'Persona no encontrada', null);
      }
      // En servicio
      const personaPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      await this.personaRepository.update(id, personaPlano);

      const updated = await this.personaRepository.findOne({ where: { id } });
      return new StatusResponseDto(true, 200, 'Persona actualizada', updated);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar persona', error);
    }
  }

  async delete(id: number, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const persona = await this.personaRepository.findOne({ where: { id } });
      if (!persona) {
        return new StatusResponseDto(false, 404, 'Persona no encontrada', null);
      }

      persona.usuarioEliminacion = usuario;
      persona.ipEliminacion = ip;
      persona.fechaEliminacion = new Date();

      await this.personaRepository.save(persona);
      await this.personaRepository.remove(persona);

      return new StatusResponseDto(true, 200, 'Persona eliminada', persona);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar persona', error);
    }
  }

  async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const personas = await this.personaRepository.findBy({ id: In(ids) });

      if (!personas.length) {
        return new StatusResponseDto(false, 404, 'No se encontraron personas para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = personas.map((persona) => {
        persona.usuarioEliminacion = usuario;
        persona.ipEliminacion = ip;
        persona.fechaEliminacion = new Date();
        return persona;
      });

      // Primero guardamos los cambios de auditoría
      await this.personaRepository.save(auditadas);

      // Luego eliminamos
      await this.personaRepository.remove(auditadas);

      return new StatusResponseDto(true, 200, 'Personas eliminadas', ids);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar múltiples personas', error);
    }
  }

}
