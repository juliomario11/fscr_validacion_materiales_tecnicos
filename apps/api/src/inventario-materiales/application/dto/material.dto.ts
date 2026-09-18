/**
 * `id` no estaba en la lista literal del spec (`codigo, descripcion,
 * unidadMedida, categoria`), pero se agrega igual: sin él, el frontend no
 * tendría forma de construir `PUT /mis-respuestas/:materialId` (la ruta usa
 * el id numérico de `materiales`, no el `codigo`) -- ver reporte del scaffold.
 */
export class MaterialResponseDto {
  public id!: number;
  public codigo!: string;
  public descripcion!: string;
  public unidadMedida!: string;
  public categoria!: string;
}
