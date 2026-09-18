import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { EstadoPrecarga } from '../../domain/entity/respuesta-inventario.entity';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import {
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/inventario-materiales.exceptions';

/**
 * El técnico (o el supervisor, operando su misma sesión) valida un ítem
 * precargado puntual: "sí lo tengo" (`confirmado`) o "ya no lo tengo"
 * (`ya_no_lo_tiene`). Nunca se le pide una cantidad nueva -- la decisión es
 * binaria a propósito (ver conversación de producto: la cantidad que trajo
 * el cron no se le muestra, solo se le dice que el sistema cree que cuenta
 * con ese ítem).
 */
@Injectable()
export class ConfirmarPrecargaUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
  ) {}

  public async execute(
    empleadoId: number,
    respuestaId: number,
    estadoPrecarga: EstadoPrecarga,
  ): Promise<RespuestaConDetalle> {
    const existente = await this.respuestasRepository.findByIdConDetalle(respuestaId);
    if (!existente || existente.empleadoId !== empleadoId || existente.origen !== 'precargado') {
      throw new RespuestaNoEncontradaException();
    }
    if (existente.estado === 'confirmado') {
      throw new RespuestaConfirmadaException();
    }

    await this.respuestasRepository.actualizarEstadoPrecarga(respuestaId, estadoPrecarga);

    const actualizado = await this.respuestasRepository.findByIdConDetalle(respuestaId);
    if (!actualizado) {
      throw new Error(`No se pudo releer la respuesta ${respuestaId} recién actualizada.`);
    }
    return actualizado;
  }
}
