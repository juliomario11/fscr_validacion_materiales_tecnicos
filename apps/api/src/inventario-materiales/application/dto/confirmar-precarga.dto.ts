import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { EstadoPrecarga } from '../../domain/entity/respuesta-inventario.entity';

export class ConfirmarPrecargaRequestDto {
  @IsIn(['confirmado', 'ya_no_lo_tiene'], {
    message: "estado debe ser 'confirmado' o 'ya_no_lo_tiene'",
  })
  public estado!: EstadoPrecarga;

  /** Requerido cuando estado='confirmado' -- la cantidad real que el técnico contó (nunca la que trajo el cron, que se mantiene oculta). Se ignora si estado='ya_no_lo_tiene'. */
  @IsOptional()
  @IsInt({ message: 'cantidad debe ser un número entero' })
  @Min(1, { message: 'cantidad debe ser al menos 1' })
  public cantidad?: number;

  /** Corrección opcional del serial que trajo el cron -- el original queda intacto en `serial_sistema`. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public serial?: string;

  /**
   * Opcionales cuando estado='confirmado'; OBLIGATORIAS cuando
   * estado='ya_no_lo_tiene' -- esa parte de la regla se valida en
   * `ConfirmarPrecargaUseCase` (no aquí vía decorador) porque depende del
   * valor de otro campo del mismo DTO.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public observaciones?: string;
}
