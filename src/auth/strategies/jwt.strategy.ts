import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Usuario } from 'src/security/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy( Strategy ) {

    constructor(
        @InjectRepository( Usuario )
        private readonly usuarioRepository: Repository<Usuario>,

        configService: ConfigService
    ) {

        super({
            secretOrKey: configService.get('JWT_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }


    async validate( payload: JwtPayload ): Promise<Usuario> {
        const { id , login} = payload;

        const usuario = await this.usuarioRepository.findOne({ where: { id, login } });

        if ( !usuario ) 
            throw new UnauthorizedException('Token no válido - usuario no existe.');
            
        if ( !usuario.activo ) 
            throw new UnauthorizedException('Usuario no activo, hable con el administrador');
        

        return usuario;
    }

}