import { IsIn } from 'class-validator';

import { EstadoPrecarga } from '../../domain/entity/respuesta-inventario.entity';

export class ConfirmarPrecargaRequestDto {
  @IsIn(['confirmado', 'ya_no_lo_tiene'], {
    message: "estado debe ser 'confirmado' o 'ya_no_lo_tiene'",
  })
  public estado!: EstadoPrecarga;
}
