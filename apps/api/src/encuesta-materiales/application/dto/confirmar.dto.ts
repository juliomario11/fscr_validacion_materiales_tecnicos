import { RespuestaResponseDto } from './respuesta.dto';

export class ConfirmarRespuestasResponseDto {
  public confirmadas!: RespuestaResponseDto[];
  public total!: number;
}
