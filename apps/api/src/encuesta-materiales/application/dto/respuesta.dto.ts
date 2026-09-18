import { EstadoRespuestaEncuesta } from '../../domain/entity/respuesta-encuesta.entity';

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
  public estado!: EstadoRespuestaEncuesta;
  public fechaInicio!: string;
  public fechaConfirmacion!: string | null;
  public adjuntos!: AdjuntoResponseDto[];
}
