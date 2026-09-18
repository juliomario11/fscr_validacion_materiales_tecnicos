export const CALENDARIO_INVENTARIO_REPOSITORY = Symbol('CALENDARIO_INVENTARIO_REPOSITORY');

export interface CalendarioInventarioRepository {
  /** `true` si la cédula tiene una fila activa en `calendario_inventario` con `fecha_asignada = fecha` (formato `YYYY-MM-DD`). */
  tieneFechaAsignadaHoy(cedula: string, fecha: string): Promise<boolean>;
}
