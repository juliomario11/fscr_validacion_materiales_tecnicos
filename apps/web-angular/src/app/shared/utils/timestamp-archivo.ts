/**
 * Timestamp legible para anexar a nombres de archivo exportados (hora local
 * del navegador, ej. `2026-09-18_1345`) -- sin `:` ni espacios, para que sea
 * válido como nombre de archivo en cualquier sistema operativo. Sin esto,
 * cada exportación de /admin/empleados o /admin/respuestas se descargaba
 * siempre con el mismo nombre, pisando la anterior.
 */
export function timestampArchivo(): string {
  const ahora = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}`;
  return `${fecha}_${hora}`;
}
