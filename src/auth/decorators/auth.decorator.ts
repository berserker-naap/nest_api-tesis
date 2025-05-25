import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuarioRoleGuard } from '../guards/user-role.guard';
import { SetMetadata } from '@nestjs/common';


export function Auth() {

  return applyDecorators(
    // RoleProtected(...roles),
    UseGuards( AuthGuard(), UsuarioRoleGuard ),
  );

}


// export const META_ROLES = 'roles';

// export const RoleProtected = (...args: VALID_ROLES[] ) => {
//     return SetMetadata( 'roles' , args);
// }
