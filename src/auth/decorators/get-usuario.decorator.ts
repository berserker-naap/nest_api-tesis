import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

export const GetUsuario = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {

        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user)
            throw new InternalServerErrorException('Usuario no encontrado - No existe en la peticion');

        return (!data)
            ? user
            : user[data];

    }
);