/**
 * Formatea un timestamp "naive" del backend (ej. `2026-09-17T18:05:07.496531`,
 * ya en hora Bogotá, sin sufijo de zona horaria -- ver
 * `apps/api/.../fecha-bogota.util.ts`) a `AAAA-MM-DD HH:MM` para las
 * exportaciones a Excel. A propósito NO se usa `Date`/`DatePipe`: como el
 * string no lleva `Z`, el navegador lo interpretaría en su propia zona
 * horaria local (no la de Bogotá), corriendo la hora mostrada. Recortar el
 * string tal cual evita esa reinterpretación.
 */
export function formatFechaCorta(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [fecha, hora] = iso.split('T');
  if (!fecha || !hora) return iso;
  return `${fecha} ${hora.slice(0, 5)}`;
}
