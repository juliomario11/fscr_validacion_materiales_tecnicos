import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { nowBogotaNaiveIso } from '../../domain/fecha-bogota.util';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import { SinRespuestasParaConfirmarException } from '../exception/encuesta-materiales.exceptions';

@Injectable()
export class ConfirmarRespuestasUseCase {
  public constructor(
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
  ) {}

  public async execute(empleadoId: number): Promise<RespuestaConDetalle[]> {
    const borradores = await this.respuestasRepository.findBorradoresByEmpleado(empleadoId);
    if (borradores.length === 0) {
      throw new SinRespuestasParaConfirmarException();
    }
    return this.respuestasRepository.confirmarBorradoresDeEmpleado(empleadoId, nowBogotaNaiveIso());
  }
}
