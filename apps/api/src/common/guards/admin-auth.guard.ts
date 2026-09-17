import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AdminTokenService } from '../services/admin-token.service';
import type { RequestWithAdmin } from '../types/request-with-admin';

/**
 * Guard del panel de administración -- se aplica explícitamente con
 * `@UseGuards(AdminAuthGuard)` (NO es global): los endpoints admin también
 * deben marcarse `@Public()` para que `SessionAuthGuard` (global) no les
 * exija la cookie de sesión de empleado, que nunca tendrán. Lee
 * `Authorization: Bearer <token>`, verifica el JWT con `tipo:'admin'` y
 * adjunta `request.admin`.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  public constructor(private readonly adminTokenService: AdminTokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    if (request.method === 'OPTIONS') return true;

    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('No autorizado: falta el token de administrador.');
    }

    try {
      request.admin = await this.adminTokenService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('No autorizado: token de administrador inválido o expirado.');
    }
  }
}
