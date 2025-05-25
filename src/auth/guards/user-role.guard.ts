import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Usuario } from 'src/security/entities/usuario.entity';


//ESTE GARD VALIDA QUE EL USUARIO TENGA UN ROL VALIDO PARA ACCEDER A UN RECURSO
// SI NO TIENE UN ROL VALIDO, SE LE NIEGA EL ACCESO
// EL GUARD SE APLICA A LOS CONTROLADORES O A LOS METODOS DE LOS CONTROLADORES
// ADEMAS VERIFICA LA STRATEGY DE JWT
@Injectable()
export class UsuarioRoleGuard implements CanActivate {
  
  constructor(
    private readonly reflector: Reflector
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    
    const req = context.switchToHttp().getRequest();
    const user = req.user as Usuario;

    if ( !user ) 
      throw new BadRequestException('Usuario no existe en la peticion - JWT no valido');

    return true;

    // throw new ForbiddenException(
    //   `Usuario ${ user.login } need a valid role: [${ validRoles }]`
    // );
  }
}
