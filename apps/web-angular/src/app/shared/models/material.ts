/** Ítem del catálogo de materiales/herramientas (`GET /materiales`). */
export interface Material {
  readonly id: number;
  readonly codigo: string;
  readonly descripcion: string;
  readonly categoria: string;
  readonly unidadMedida: string;
}
