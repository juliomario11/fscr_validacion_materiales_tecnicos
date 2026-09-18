export type EstadoRespuestaInventario = 'borrador' | 'confirmado';

/** `manual`: agregada por el técnico/supervisor desde el catálogo. `precargado`: la generó el cron de las 5 AM a partir de `materiales_precargados_raw`. */
export type OrigenRespuesta = 'manual' | 'precargado';

/** Solo aplica cuando `origen = 'precargado'`: decisión del técnico/supervisor sobre ese ítem preasignado. */
export type EstadoPrecarga = 'confirmado' | 'ya_no_lo_tiene';

/**
 * Declaración de un empleado sobre la cantidad que tiene en su poder de UN
 * material concreto (`inventario_respuestas`). Empieza en `'borrador'`
 * (editable) y pasa a `'confirmado'` de forma DEFINITIVA vía `POST
 * /mis-respuestas/confirmar` (ver `RespuestaConfirmadaException` para el
 * porqué de "definitivo" en este primer scaffold).
 *
 * Antes había como máximo una fila por `(empleadoId, materialId)`. Con la
 * precarga de inventario eso cambió: un técnico puede tener varias
 * unidades serializadas del mismo material (ej. 10 decodificadores con 10
 * seriales distintos), así que ahora la fila es única por
 * `(empleadoId, materialId, serial)` -- ver el índice
 * `inventario_respuestas_empleado_material_serial_key` en la migración. Las
 * filas `origen = 'manual'` siguen usando `serial = null` como antes (una
 * sola fila "libre" por material para ese origen).
 */
export interface RespuestaInventario {
  id: number;
  empleadoId: number;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
  /** Número de serie VIGENTE del ítem. En filas `manual` es opcional (lo tipea el técnico); en `precargado` empieza igual a `serialSistema` pero el técnico puede corregirlo al confirmar. */
  serial: string | null;
  /** Solo `origen='precargado'`: el serial tal cual lo trajo el cron, congelado desde el insert -- nunca cambia, aunque `serial` sí se corrija. `null` en filas `manual`. */
  serialSistema: string | null;
  estado: EstadoRespuestaInventario;
  origen: OrigenRespuesta;
  /** `null` mientras el técnico no haya validado este ítem precargado (solo aplica a `origen = 'precargado'`). */
  estadoPrecarga: EstadoPrecarga | null;
  /** Cantidad que trajo el cron para este ítem -- nunca se le muestra al técnico, solo visible en `/admin` para comparar contra lo que él confirme. */
  cantidadPrecargada: number | null;
  /** `true` si esta fila se creó/confirmó un día distinto al que `calendario_inventario` le asignaba a esa cédula. */
  fueraDeFecha: boolean;
  fechaInicio: string;
  fechaConfirmacion: string | null;
  createdAt: string;
  updatedAt: string;
}
