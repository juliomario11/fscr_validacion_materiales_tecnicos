/** Catálogo cerrado de materiales/herramientas (`materiales`, 358 filas, poblado externamente). */
export interface Material {
  id: number;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  categoria: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
