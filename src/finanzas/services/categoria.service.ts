import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponseDto } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Categoria } from "../entities/categoria.entity";
import { CreateUpdateCategoriaDto } from "../dto/categoria.dto";

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>
  ) { }

  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const categorias = await this.categoriaRepository.find();
      return new StatusResponseDto(true, 200, 'Categorias obtenidas', categorias);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener categorias', error);
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const categoria = await this.categoriaRepository.findOne({ where: { id } });
      if (!categoria) {
        return new StatusResponseDto(false, 404, 'Categoria no encontrada', null);
      }
      return new StatusResponseDto(true, 200, 'Categoria encontrada', categoria);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdateCategoriaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const categoria = this.categoriaRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.categoriaRepository.save(categoria);
      return new StatusResponseDto(true, 201, 'Categoria creada', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear categoria', error);
    }
  }


  async update(id: number, dto: CreateUpdateCategoriaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const categoria = await this.categoriaRepository.findOne({ where: { id } });
      if (!categoria) {
        return new StatusResponseDto(false, 404, 'Categoria no encontrada', null);
      }
      // En servicio
      const categoriaPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      await this.categoriaRepository.update(id, categoriaPlano);

      const updated = await this.categoriaRepository.findOne({ where: { id } });
      return new StatusResponseDto(true, 200, 'Categoria actualizada', updated);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar categoria', error);
    }
  }

  async delete(id: number, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const categoria = await this.categoriaRepository.findOne({ where: { id } });
      if (!categoria) {
        return new StatusResponseDto(false, 404, 'Categoria no encontrada', null);
      }

      categoria.usuarioEliminacion = usuario;
      categoria.ipEliminacion = ip;
      categoria.fechaEliminacion = new Date();

      await this.categoriaRepository.save(categoria);
      await this.categoriaRepository.remove(categoria);

      return new StatusResponseDto(true, 200, 'Categoria eliminada', categoria);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar categoria', error);
    }
  }

  async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const categorias = await this.categoriaRepository.findBy({ id: In(ids) });

      if (!categorias.length) {
        return new StatusResponseDto(false, 404, 'No se encontraron categorias para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = categorias.map((categoria) => {
        categoria.usuarioEliminacion = usuario;
        categoria.ipEliminacion = ip;
        categoria.fechaEliminacion = new Date();
        return categoria;
      });

      // Primero guardamos los cambios de auditoría
      await this.categoriaRepository.save(auditadas);

      // Luego eliminamos
      await this.categoriaRepository.remove(auditadas);

      return new StatusResponseDto(true, 200, 'Categorias eliminadas', ids);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar múltiples categorias', error);
    }
  }

}
