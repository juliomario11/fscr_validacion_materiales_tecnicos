import { Injectable } from '@nestjs/common';

/** Igual TTL que la sesión de empleado -- sin razón de negocio para que difieran. */
const ADMIN_SESSION_TTL = '8h';

export interface AdminTokenPayload {
  tipo: 'admin';
  usuario: string;
}

function getSecretKey(): Uint8Array {
  const secret = (process.env.SESSION_SECRET ?? '').trim();
  if (!secret) {
    throw new Error('SESSION_SECRET no está configurado en el entorno del servidor.');
  }
  return new TextEncoder().encode(secret);
}

function parseAdminPayload(payload: unknown): AdminTokenPayload {
  const { tipo, usuario } = (payload ?? {}) as { tipo?: unknown; usuario?: unknown };
  if (tipo !== 'admin' || typeof usuario !== 'string') {
    throw new Error('Token de administrador con formato de payload inválido.');
  }
  return { tipo: 'admin', usuario };
}

/**
 * Token de sesión del panel de administración -- completamente aparte del
 * de empleado (`SessionTokenService`): reusa el mismo `SESSION_SECRET` por
 * simplicidad (no hay necesidad real de un secreto distinto), pero el claim
 * `tipo:'admin'` evita que un token de empleado se cuele como admin o
 * viceversa. Va en `Authorization: Bearer <token>`, NUNCA en cookie -- el
 * panel admin es una sección aparte de la SPA con su propio login.
 */
@Injectable()
export class AdminTokenService {
  public async issue(usuario: string): Promise<string> {
    const { SignJWT } = await import('jose');
    const secretKey = getSecretKey();
    return new SignJWT({ tipo: 'admin', usuario })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ADMIN_SESSION_TTL)
      .sign(secretKey);
  }

  public async verify(token: string): Promise<AdminTokenPayload> {
    const { jwtVerify } = await import('jose');
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return parseAdminPayload(payload);
  }
}
