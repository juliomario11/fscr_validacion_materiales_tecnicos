/** Nombre de la cookie httpOnly que transporta la sesión del empleado. */
export const SESSION_COOKIE_NAME = 'fscr_encuesta_session';

/**
 * Parser mínimo de la cabecera HTTP `Cookie` (`"a=1; b=2"` -> `{a: '1', b: '2'}`).
 *
 * Se implementa a mano en vez de depender de `cookie-parser`: `res.cookie()`
 * (usado para EMITIR la cookie de sesión) ya viene incluido en Express sin
 * dependencias extra, y aquí solo necesitamos LEER un único valor conocido
 * (`SESSION_COOKIE_NAME`) desde `SessionAuthGuard` -- no justifica sumar una
 * dependencia completa de parsing de cookies para un caso tan acotado.
 */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const rawValue = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}
