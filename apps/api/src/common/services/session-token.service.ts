import { Injectable } from '@nestjs/common';

/** Duración de la sesión emitida en el login (cédula, sin contraseña). */
const SESSION_TTL = '8h';

export interface SessionEmpleado {
  empleadoId: number;
  cedula: string;
}

function getSecretKey(): Uint8Array {
  const secret = (process.env.SESSION_SECRET ?? '').trim();
  if (!secret) {
    // No se traduce a una excepción de dominio propia: es un error de
    // CONFIGURACIÓN del servidor (falta el secreto), no un rechazo de
    // negocio -- el filtro global lo deja caer al branch genérico 500,
    // y `main.ts` ya advierte en el arranque si `SESSION_SECRET` falta.
    throw new Error('SESSION_SECRET no está configurado en el entorno del servidor.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * No se tipa el parámetro con `JWTPayload` de `jose` a propósito: importar
 * SOLO el tipo desde un paquete ESM-only exige un atributo
 * `resolution-mode` bajo `module: "Node16"` (TS1541/1542) -- para un tipo
 * que de todas formas se re-valida a mano acá mismo, no vale la pena la
 * fricción. `unknown` obliga a ese chequeo explícito igual.
 */
function parseSessionPayload(payload: unknown): SessionEmpleado {
  const { empleadoId, cedula } = (payload ?? {}) as { empleadoId?: unknown; cedula?: unknown };
  if (typeof empleadoId !== 'number' || typeof cedula !== 'string') {
    throw new Error('Token de sesión con formato de payload inválido.');
  }
  return { empleadoId, cedula };
}

/**
 * Emite y verifica el JWT de sesión del empleado (claims `empleadoId` +
 * `cedula`, firmado HS256 con `jose`). Se guarda como cookie httpOnly
 * (`SESSION_COOKIE_NAME`) — nunca se expone al JS del navegador.
 *
 * `jose` v6 publica solo ESM (sin condición `require` en su `package.json`)
 * -- con `module: "Node16"` y este archivo compilando a CommonJS (sin
 * `"type": "module"` en `package.json`), un `import ... from 'jose'`
 * ESTÁTICO produce el error TS1479 ("cannot be imported with require"). La
 * propia recomendación del compilador es un `import()` DINÁMICO, que Node
 * interopera de forma nativa CJS -> ESM; se usa directo en cada llamada
 * (sin envoltorio de caché propio) porque el loader de módulos de Node ya
 * cachea internamente la instancia del módulo ESM resuelto.
 */
@Injectable()
export class SessionTokenService {
  public async issue(empleado: SessionEmpleado): Promise<string> {
    const { SignJWT } = await import('jose');
    const secretKey = getSecretKey();
    return new SignJWT({ empleadoId: empleado.empleadoId, cedula: empleado.cedula })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(SESSION_TTL)
      .sign(secretKey);
  }

  public async verify(token: string): Promise<SessionEmpleado> {
    const { jwtVerify } = await import('jose');
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return parseSessionPayload(payload);
  }
}
