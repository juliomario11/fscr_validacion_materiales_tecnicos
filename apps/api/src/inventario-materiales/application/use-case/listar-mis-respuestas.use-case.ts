import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';

@Injectable()
export class ListarMisRespuestasUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
  ) {}

  /** Todas las respuestas (borrador + confirmado) del empleado autenticado. */
  public async execute(empleadoId: number): Promise<RespuestaConDetalle[]> {
    return this.respuestasRepository.findAllByEmpleadoConDetalle(empleadoId);
  }
}
