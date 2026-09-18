import { RespuestaConDetalle } from '../entity/respuesta-detalle.entity';
import { RespuestaEncuesta } from '../entity/respuesta-encuesta.entity';

export const RESPUESTAS_ENCUESTA_REPOSITORY = Symbol('RESPUESTAS_ENCUESTA_REPOSITORY');

export interface UpsertRespuestaPayload {
  empleadoId: number;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
  serial: string | null;
}

export interface RespuestasEncuestaRepository {
  /** Todas las respuestas (borrador + confirmado) del empleado, con material y adjuntos embebidos (GET /mis-respuestas). */
  findAllByEmpleadoConDetalle(empleadoId: number): Promise<RespuestaConDetalle[]>;
  /** Todas las respuestas de TODOS los empleados, con material y adjuntos embebidos -- solo para el panel de administración. */
  findAllConDetalle(): Promise<RespuestaConDetalle[]>;
  /** `null` si el empleado no tiene fila para ese material -- usado para decidir insert vs. update y para validar dueño+estado antes de borrar/adjuntar. */
  findByEmpleadoYMaterial(empleadoId: number, materialId: number): Promise<RespuestaEncuesta | null>;
  findByIdConDetalle(id: number): Promise<RespuestaConDetalle | null>;
  insert(payload: UpsertRespuestaPayload): Promise<RespuestaEncuesta>;
  update(
    id: number,
    payload: Pick<UpsertRespuestaPayload, 'cantidad' | 'observaciones' | 'serial'>,
  ): Promise<RespuestaEncuesta>;
  /** Solo debe llamarse tras confirmar (en el use-case) que la fila está en estado 'borrador'. */
  delete(id: number): Promise<void>;
  findBorradoresByEmpleado(empleadoId: number): Promise<RespuestaEncuesta[]>;
  /**
   * Marca TODAS las respuestas en `'borrador'` del empleado como
   * `'confirmado'` (con `fecha_confirmacion = fechaConfirmacionBogota`) y
   * devuelve las filas actualizadas con el material embebido, para que
   * `ConfirmarRespuestasUseCase` no tenga que re-consultar.
   */
  confirmarBorradoresDeEmpleado(
    empleadoId: number,
    fechaConfirmacionBogota: string,
  ): Promise<RespuestaConDetalle[]>;
}
