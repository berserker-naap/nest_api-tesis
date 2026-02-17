import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { ProfileCatalogService } from '../services/persona.service';
import { CreateProfileDto, UpdateProfileDto } from '../dto/persona.dto';
import { GetClientIp } from 'src/auth/decorators/get-client-ip.decorator';

@Controller('profile-catalog')
export class ProfileCatalogController {
  constructor(private readonly profileCatalogService: ProfileCatalogService) {}

  @Get()
  @Auth()
  findAll() {
    return this.profileCatalogService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: number) {
    return this.profileCatalogService.findOne(id);
  }

  @Post()
  @Auth()
  create(
    @Body() dto: CreateProfileDto,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profileCatalogService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id') id: number,
    @Body() dto: UpdateProfileDto,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profileCatalogService.update(id, dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  delete(
    @Param('id') id: number,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profileCatalogService.delete(id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(
    @Body() ids: number[],
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profileCatalogService.deleteMany(ids, user.login, ip);
  }
}
