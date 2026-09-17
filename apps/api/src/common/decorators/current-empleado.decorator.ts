import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

import type { RequestWithEmpleado } from '../types/request-with-empleado';
import type { SessionEmpleado } from '../services/session-token.service';

/**
 * Extrae el empleado autenticado (`empleadoId` + `cedula`) que
 * `SessionAuthGuard` ya validó y adjuntó a la request -- los controllers
 * NUNCA deben leer `empleadoId` desde el body/query/params del cliente.
 */
export const CurrentEmpleado = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionEmpleado => {
    const request = ctx.switchToHttp().getRequest<RequestWithEmpleado>();
    if (!request.empleado) {
      // Solo puede ocurrir si un handler usa @CurrentEmpleado() sin estar
      // detrás de SessionAuthGuard (p. ej. si se lo marcó @Public() por error).
      throw new InternalServerErrorException(
        '@CurrentEmpleado() usado en una ruta sin SessionAuthGuard.',
      );
    }
    return request.empleado;
  },
);
