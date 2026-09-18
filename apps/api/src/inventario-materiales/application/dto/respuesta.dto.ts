import {
  EstadoPrecarga,
  EstadoRespuestaInventario,
  OrigenRespuesta,
} from '../../domain/entity/respuesta-inventario.entity';

export class AdjuntoResponseDto {
  public id!: number;
  public nombreArchivo!: string;
  public subidoEn!: string;
}

export class MaterialEmbebidoDto {
  public id!: number;
  public codigo!: string;
  public descripcion!: string;
  public unidadMedida!: string;
  public categoria!: string;
}

export class RespuestaResponseDto {
  public id!: number;
  public materialId!: number;
  public material!: MaterialEmbebidoDto;
  public cantidad!: number;
  public observaciones!: string | null;
  public serial!: string | null;
  /** Solo `origen='precargado'`: serial original del cron, congelado -- para que el técnico/admin vea qué corrigió. `null` en filas `manual`. */
  public serialSistema!: string | null;
  public estado!: EstadoRespuestaInventario;
  /** `manual` (lo agregó el técnico/supervisor) o `precargado` (vino del cron de las 5 AM). */
  public origen!: OrigenRespuesta;
  /** Solo aplica a `origen='precargado'`: `null` mientras no se valide. Nunca se expone `cantidadPrecargada` -- ver decisión de producto. */
  public estadoPrecarga!: EstadoPrecarga | null;
  public fechaInicio!: string;
  public fechaConfirmacion!: string | null;
  public adjuntos!: AdjuntoResponseDto[];
}
