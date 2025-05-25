import { Body, Controller, Post, Put, Delete, Param } from '@nestjs/common';
import { CreateMultitablaDto, UpdateMultitablaDto, UpsertMultitablaDto } from '../dto/multitabla.dto';
import { MultitablaService } from '../services/multitabla.service';

@Controller('multitabla')
export class MultitablaController {
  constructor(private readonly service: MultitablaService) {}

  @Post()
  create(@Body() dto: CreateMultitablaDto) {
    return this.service.create(dto);
  }

  @Put()
  update(@Body() dto: UpdateMultitablaDto) {
    return this.service.update(dto);
  }

  @Delete(':id')
  eliminar(
    @Param('id') id: number,
    @Body('usuarioEliminacion') usuarioEliminacion: string,
    @Body('ipEliminacion') ipEliminacion?: string,
  ) {
    return this.service.eliminar(id, usuarioEliminacion, ipEliminacion);
  }

  @Put('habilitar/:id')
  habilitar(@Param('id') id: number, @Body('activo') activo: boolean) {
    return this.service.habilitar(id, activo);
  }

  @Post('upsert-many')
  upsertMany(@Body() dtos: UpsertMultitablaDto[]) {
    return this.service.upsertMany(dtos);
  }
}
