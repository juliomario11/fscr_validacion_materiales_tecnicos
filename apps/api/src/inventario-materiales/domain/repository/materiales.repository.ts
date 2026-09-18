import { Material } from '../entity/material.entity';

export const MATERIALES_REPOSITORY = Symbol('MATERIALES_REPOSITORY');

/** Catálogo cerrado (358 filas) -- solo lectura desde esta API, nunca se crea/edita aquí. */
export interface MaterialesRepository {
  /** Catálogo completo activo, ordenado por categoría y luego descripción (GET /materiales). */
  findAllActivos(): Promise<Material[]>;
  /** `null` si el id no existe o si `activo = false`. */
  findActivoById(id: number): Promise<Material | null>;
  /** Usado para mapear `codigo_material` de `materiales_precargados_raw` al `material_id` interno. `null` si no hay match o el material no está activo. */
  findActivoByCodigo(codigo: string): Promise<Material | null>;
}
