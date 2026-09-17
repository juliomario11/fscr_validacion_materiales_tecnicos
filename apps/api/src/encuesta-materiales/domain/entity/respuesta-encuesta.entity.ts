export type EstadoRespuestaEncuesta = 'borrador' | 'confirmado';

/**
 * Declaración de un empleado sobre la cantidad que tiene en su poder de UN
 * material concreto (`encuesta_respuestas`, UNIQUE(empleado_id, material_id)).
 * Empieza en `'borrador'` (editable) y pasa a `'confirmado'` de forma
 * DEFINITIVA vía `POST /mis-respuestas/confirmar` (ver
 * `RespuestaConfirmadaException` para el porqué de "definitivo" en este
 * primer scaffold).
 */
export interface RespuestaEncuesta {
  id: number;
  empleadoId: number;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
  estado: EstadoRespuestaEncuesta;
  fechaInicio: string;
  fechaConfirmacion: string | null;
  createdAt: string;
  updatedAt: string;
}
