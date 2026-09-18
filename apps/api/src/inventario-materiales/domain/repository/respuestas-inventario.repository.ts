import { EstadoPrecarga } from '../entity/respuesta-inventario.entity';
import { RespuestaConDetalle } from '../entity/respuesta-detalle.entity';
import { RespuestaInventario } from '../entity/respuesta-inventario.entity';

export const RESPUESTAS_INVENTARIO_REPOSITORY = Symbol('RESPUESTAS_INVENTARIO_REPOSITORY');

/** Solo para el flujo MANUAL (agregar/editar desde el catálogo) -- `origen` sale implícito del `DEFAULT 'manual'` de la columna. */
export interface UpsertRespuestaPayload {
  empleadoId: number;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
  serial: string | null;
  fueraDeFecha: boolean;
}

/** Una fila por cada registro de `materiales_precargados_raw` ya mapeado a `material_id`. */
export interface InsertPrecargadoPayload {
  empleadoId: number;
  materialId: number;
  serial: string | null;
  cantidadPrecargada: number | null;
  serialPrecargadoId: number;
  fueraDeFecha: boolean;
}

export interface RespuestasInventarioRepository {
  /** Todas las respuestas (borrador + confirmado) del empleado, con material y adjuntos embebidos (GET /mis-respuestas). */
  findAllByEmpleadoConDetalle(empleadoId: number): Promise<RespuestaConDetalle[]>;
  /** Todas las respuestas de TODOS los empleados, con material y adjuntos embebidos -- solo para el panel de administración. */
  findAllConDetalle(): Promise<RespuestaConDetalle[]>;
  /**
   * La fila MANUAL (`origen = 'manual'`) de este material para este
   * empleado, si existe -- nunca las filas `origen = 'precargado'` (esas se
   * validan aparte, ver `actualizarEstadoPrecarga`). `null` si el empleado
   * no ha agregado manualmente ese material. Usado para decidir insert vs.
   * update y para validar dueño+estado antes de borrar/adjuntar.
   */
  findByEmpleadoYMaterial(empleadoId: number, materialId: number): Promise<RespuestaInventario | null>;
  findByIdConDetalle(id: number): Promise<RespuestaConDetalle | null>;
  insert(payload: UpsertRespuestaPayload): Promise<RespuestaInventario>;
  update(
    id: number,
    payload: Pick<UpsertRespuestaPayload, 'cantidad' | 'observaciones' | 'serial' | 'fueraDeFecha'>,
  ): Promise<RespuestaInventario>;
  /** Solo debe llamarse tras confirmar (en el use-case) que la fila está en estado 'borrador' y es `origen = 'manual'`. */
  delete(id: number): Promise<void>;
  findBorradoresByEmpleado(empleadoId: number): Promise<RespuestaInventario[]>;
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

  /**
   * Inserta en bloque las filas precargadas del cron (`origen =
   * 'precargado'`, `estado_precarga = null` hasta que el técnico decida).
   * Silencioso ante conflicto de unicidad (empleado+material+serial ya
   * materializado en un login anterior del mismo día) -- no debe romper el
   * login si se llama dos veces.
   */
  insertPrecargados(payloads: ReadonlyArray<InsertPrecargadoPayload>): Promise<void>;
  /** Todas las filas `origen = 'precargado'` de este empleado (con o sin decisión ya tomada). */
  findPrecargadosByEmpleado(empleadoId: number): Promise<RespuestaInventario[]>;
  /**
   * Registra la decisión del técnico/supervisor sobre un ítem precargado
   * puntual (por el id de esa fila) junto con la cantidad real que contó
   * (0 si `ya_no_lo_tiene`). `serial`/`observaciones` son opcionales --
   * `undefined` deja el valor actual intacto, útil cuando el técnico no
   * corrigió nada.
   */
  actualizarEstadoPrecarga(
    id: number,
    estadoPrecarga: EstadoPrecarga,
    cantidad: number,
    serial?: string | null,
    observaciones?: string | null,
  ): Promise<RespuestaInventario>;
}
