import { EmpleadoInventario } from '../entity/empleado-inventario.entity';

export const EMPLEADOS_INVENTARIO_REPOSITORY = Symbol('EMPLEADOS_INVENTARIO_REPOSITORY');

/** Whitelist cerrada (113 filas) -- solo lectura desde esta API. */
export interface EmpleadosInventarioRepository {
  /** `null` si la cédula no existe o si `activo = false` (ambos casos son "no autorizado" para el login). */
  findActivoByCedula(cedula: string): Promise<EmpleadoInventario | null>;
  /** Para el panel de administración -- todos los empleados activos, sin filtrar por cédula. */
  findAllActivos(): Promise<EmpleadoInventario[]>;
}
