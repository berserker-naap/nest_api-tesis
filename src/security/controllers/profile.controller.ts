import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { UploadedFile as UploadedFileType } from 'src/common/types/uploaded-file.type';
import { Usuario } from '../entities/usuario.entity';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDataDto } from '../dto/profile.dto';

@Controller('profile')
@Auth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  me(@GetUsuario() usuario: Usuario) {
    return this.profileService.me(usuario);
  }

  @Patch('data')
  updateProfileData(
    @GetUsuario() usuario: Usuario,
    @Body() dto: UpdateProfileDataDto,
    @GetClientIp() ip: string,
  ) {
    return this.profileService.updateProfileData(usuario, dto, ip);
  }

  @Patch('photo')
  @UseInterceptors(FileInterceptor('file'))
  updateProfilePhoto(
    @GetUsuario() usuario: Usuario,
    @UploadedFile() file: UploadedFileType | undefined,
    @GetClientIp() ip: string,
  ) {
    return this.profileService.updateProfilePhoto(usuario, file, ip);
  }
}
