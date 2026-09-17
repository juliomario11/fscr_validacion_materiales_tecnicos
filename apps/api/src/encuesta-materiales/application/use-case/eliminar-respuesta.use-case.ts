import { Inject, Injectable } from '@nestjs/common';

import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import {
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/encuesta-materiales.exceptions';

@Injectable()
export class EliminarRespuestaUseCase {
  public constructor(
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
  ) {}

  public async execute(empleadoId: number, materialId: number): Promise<void> {
    const existente = await this.respuestasRepository.findByEmpleadoYMaterial(empleadoId, materialId);
    if (!existente) {
      throw new RespuestaNoEncontradaException();
    }
    if (existente.estado === 'confirmado') {
      throw new RespuestaConfirmadaException(
        'Esta respuesta ya fue confirmada y no se puede eliminar.',
      );
    }

    // El FK `ON DELETE CASCADE` de `encuesta_adjuntos` limpia la metadata en
    // BD, pero NO los binarios ya subidos al bucket de Storage.
    // TODO: job de limpieza de objetos huérfanos en
    // `validacion-materiales-adjuntos` -- fuera de alcance de este scaffold.
    await this.respuestasRepository.delete(existente.id);
  }
}
