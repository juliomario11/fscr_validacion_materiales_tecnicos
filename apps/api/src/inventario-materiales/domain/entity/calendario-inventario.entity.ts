/**
 * Fecha en la que a una cédula le corresponde hacer la toma de inventario
 * (`calendario_inventario`, esquema `validacion_materiales_tecnicos`).
 * Poblada manualmente vía SQL con la tabla que pasa el negocio -- no tiene
 * pantalla de administración en este primer alcance (ver PENDIENTES.md).
 */
export interface CalendarioInventario {
  id: number;
  cedula: string;
  /** Fecha en formato `YYYY-MM-DD` (columna `date`, sin hora). */
  fechaAsignada: string;
  activo: boolean;
}
