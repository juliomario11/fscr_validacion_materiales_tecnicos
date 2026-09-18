import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { nowBogotaNaiveIso } from '../../domain/fecha-bogota.util';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import {
  PrecargaSinValidarException,
  SinRespuestasParaConfirmarException,
} from '../exception/inventario-materiales.exceptions';

@Injectable()
export class ConfirmarRespuestasUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
  ) {}

  public async execute(empleadoId: number): Promise<RespuestaConDetalle[]> {
    const borradores = await this.respuestasRepository.findBorradoresByEmpleado(empleadoId);
    if (borradores.length === 0) {
      throw new SinRespuestasParaConfirmarException();
    }

    // No se puede confirmar mientras queden ítems precargados sin decisión
    // ("sí lo tengo" / "ya no lo tengo") -- ver ConfirmarPrecargaUseCase.
    const sinValidar = borradores.some((r) => r.origen === 'precargado' && r.estadoPrecarga === null);
    if (sinValidar) {
      throw new PrecargaSinValidarException();
    }

    return this.respuestasRepository.confirmarBorradoresDeEmpleado(empleadoId, nowBogotaNaiveIso());
  }
}
