import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponse } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Subcategoria } from "../entities/subcategoria.entity";
import { CreateUpdateSubcategoriaDto } from "../dto/subcategoria.dto";

@Injectable()
export class SubcategoriaService {
  constructor(
    @InjectRepository(Subcategoria)
    private readonly subcategoriaRepository: Repository<Subcategoria>
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const subsubcategorias = await this.subcategoriaRepository.find();
      return new StatusResponse(true, 200, 'Subsubsubcategorias obtenidas', subsubcategorias);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener subsubcategorias', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const subcategoria = await this.subcategoriaRepository.findOne({ where: { id } });
      if (!subcategoria) {
        return new StatusResponse(false, 404, 'Subcategoria no encontrada', null);
      }
      return new StatusResponse(true, 200, 'Subcategoria encontrada', subcategoria);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdateSubcategoriaDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const subcategoria = this.subcategoriaRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.subcategoriaRepository.save(subcategoria);
      return new StatusResponse(true, 201, 'Subcategoria creada', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear subcategoria', error);
    }
  }


  async update(id: number, dto: CreateUpdateSubcategoriaDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const subcategoria = await this.subcategoriaRepository.findOne({ where: { id } });
      if (!subcategoria) {
        return new StatusResponse(false, 404, 'Subcategoria no encontrada', null);
      }
      // En servicio
      const subcategoriaPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      await this.subcategoriaRepository.update(id, subcategoriaPlano);

      const updated = await this.subcategoriaRepository.findOne({ where: { id } });
      return new StatusResponse(true, 200, 'Subcategoria actualizada', updated);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al actualizar subcategoria', error);
    }
  }

  async delete(id: number, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const subcategoria = await this.subcategoriaRepository.findOne({ where: { id } });
      if (!subcategoria) {
        return new StatusResponse(false, 404, 'Subcategoria no encontrada', null);
      }

      subcategoria.usuarioEliminacion = usuario;
      subcategoria.ipEliminacion = ip;
      subcategoria.fechaEliminacion = new Date();

      await this.subcategoriaRepository.save(subcategoria);
      await this.subcategoriaRepository.remove(subcategoria);

      return new StatusResponse(true, 200, 'Subcategoria eliminada', subcategoria);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar subcategoria', error);
    }
  }

  async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const subsubcategorias = await this.subcategoriaRepository.findBy({ id: In(ids) });

      if (!subsubcategorias.length) {
        return new StatusResponse(false, 404, 'No se encontraron subsubcategorias para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = subsubcategorias.map((subcategoria) => {
        subcategoria.usuarioEliminacion = usuario;
        subcategoria.ipEliminacion = ip;
        subcategoria.fechaEliminacion = new Date();
        return subcategoria;
      });

      // Primero guardamos los cambios de auditoría
      await this.subcategoriaRepository.save(auditadas);

      // Luego eliminamos
      await this.subcategoriaRepository.remove(auditadas);

      return new StatusResponse(true, 200, 'Subsubsubcategorias eliminadas', ids);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar múltiples subsubcategorias', error);
    }
  }

}
