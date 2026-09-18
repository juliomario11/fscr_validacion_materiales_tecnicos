/**
 * Fila cruda de `materiales_precargados_raw` -- la puebla un cron EXTERNO
 * (Node.js, fuera de este repo) todos los días a las 5 AM con lo que el
 * sistema de inventario real (Geproc/equipos_fscr) tiene registrado para
 * cada cédula. Este backend solo LEE las filas con `procesado = false` para
 * la cédula que inicia sesión hoy y las convierte en filas de
 * `inventario_respuestas` (`origen = 'precargado'`) -- nunca escribe en esta
 * tabla más que el flag `procesado`.
 */
export interface MaterialPrecargadoRaw {
  id: number;
  cedula: string;
  serial: string | null;
  codigoMaterial: string;
  material: string | null;
  descripcionAmpliada: string | null;
  bodega: string | null;
  direccionBodega: string | null;
  estado: string | null;
  referencia: string | null;
  costo: number | null;
  cantidad: number | null;
  lote: string | null;
  area: string | null;
  fechaCarga: string;
  procesado: boolean;
}
