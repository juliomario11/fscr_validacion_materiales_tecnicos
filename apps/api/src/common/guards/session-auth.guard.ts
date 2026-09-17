import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionTokenService } from '../services/session-token.service';
import type { RequestWithEmpleado } from '../types/request-with-empleado';
import { parseCookieHeader, SESSION_COOKIE_NAME } from '../utils/cookie.util';

/**
 * Guard global (registrado como `APP_GUARD` en `AppModule`): "seguro por
 * defecto" -- cualquier endpoint nuevo queda protegido salvo que se marque
 * explícitamente `@Public()` (login, logout, health). Lee la cookie httpOnly
 * `fscr_encuesta_session`, verifica el JWT (`jose`) y adjunta
 * `request.empleado = { empleadoId, cedula }` para que los controllers lo
 * consuman vía `@CurrentEmpleado()` -- nunca confiar en un `empleadoId` que
 * venga del cliente (body/query/params).
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<RequestWithEmpleado>();

    // Preflight CORS: el browser no manda la cookie en OPTIONS.
    if (request.method === 'OPTIONS') return true;

    const cookies = parseCookieHeader(request.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('No autorizado: sesión no encontrada.');
    }

    try {
      request.empleado = await this.sessionTokenService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('No autorizado: sesión inválida o expirada.');
    }
  }
}
