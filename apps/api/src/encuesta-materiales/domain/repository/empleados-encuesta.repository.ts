import { EmpleadoEncuesta } from '../entity/empleado-encuesta.entity';

export const EMPLEADOS_ENCUESTA_REPOSITORY = Symbol('EMPLEADOS_ENCUESTA_REPOSITORY');

/** Whitelist cerrada (113 filas) -- solo lectura desde esta API. */
export interface EmpleadosEncuestaRepository {
  /** `null` si la cédula no existe o si `activo = false` (ambos casos son "no autorizado" para el login). */
  findActivoByCedula(cedula: string): Promise<EmpleadoEncuesta | null>;
  /** Para el panel de administración -- todos los empleados activos, sin filtrar por cédula. */
  findAllActivos(): Promise<EmpleadoEncuesta[]>;
}
