import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';

@Injectable()
export class ListarMisRespuestasUseCase {
  public constructor(
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
  ) {}

  /** Todas las respuestas (borrador + confirmado) del empleado autenticado. */
  public async execute(empleadoId: number): Promise<RespuestaConDetalle[]> {
    return this.respuestasRepository.findAllByEmpleadoConDetalle(empleadoId);
  }
}
