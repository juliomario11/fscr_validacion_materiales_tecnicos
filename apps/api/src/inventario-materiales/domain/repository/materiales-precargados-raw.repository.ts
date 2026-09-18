import { MaterialPrecargadoRaw } from '../entity/material-precargado-raw.entity';

export const MATERIALES_PRECARGADOS_RAW_REPOSITORY = Symbol('MATERIALES_PRECARGADOS_RAW_REPOSITORY');

export interface MaterialesPrecargadosRawRepository {
  /** Filas sin procesar para esta cédula -- se materializan en `inventario_respuestas` al iniciar sesión. */
  findPendientesPorCedula(cedula: string): Promise<MaterialPrecargadoRaw[]>;
  /** Marca como procesadas las filas dadas (idempotencia: no se vuelven a materializar en un próximo login del mismo día). */
  marcarProcesadas(ids: ReadonlyArray<number>): Promise<void>;
}
