import { Inject, Injectable } from '@nestjs/common';

import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import {
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/inventario-materiales.exceptions';

@Injectable()
export class EliminarRespuestaUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
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

    // El FK `ON DELETE CASCADE` de `inventario_adjuntos` limpia la metadata en
    // BD, pero NO los binarios ya subidos al bucket de Storage.
    // TODO: job de limpieza de objetos huérfanos en
    // `validacion-materiales-adjuntos` -- fuera de alcance de este scaffold.
    await this.respuestasRepository.delete(existente.id);
  }
}
