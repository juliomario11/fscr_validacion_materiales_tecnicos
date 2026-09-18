import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { EstadoPrecarga } from '../../domain/entity/respuesta-inventario.entity';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import {
  CantidadPrecargaInvalidaException,
  ObservacionesPrecargaRequeridasException,
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/inventario-materiales.exceptions';

/**
 * El técnico (o el supervisor, operando su misma sesión) valida un ítem
 * precargado puntual: "sí lo tengo" (`confirmado`, indicando cuántas
 * unidades reales cuenta) o "ya no lo tengo" (`ya_no_lo_tiene`, cantidad
 * forzada a 0). Nunca se le muestra la cantidad que trajo el cron -- eso
 * queda en `cantidad_precargada`, solo visible en /admin.
 *
 * El frontend llama este endpoint una vez por ítem, en paralelo, justo
 * antes de la confirmación global (`POST /mis-respuestas/confirmar`) --
 * hasta ese momento las decisiones viven solo en memoria del navegador.
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
    cantidad: number | null,
    serial?: string,
    observaciones?: string,
  ): Promise<RespuestaConDetalle> {
    const existente = await this.respuestasRepository.findByIdConDetalle(respuestaId);
    if (!existente || existente.empleadoId !== empleadoId || existente.origen !== 'precargado') {
      throw new RespuestaNoEncontradaException();
    }
    if (existente.estado === 'confirmado') {
      throw new RespuestaConfirmadaException();
    }

    if (estadoPrecarga === 'confirmado' && (cantidad === null || cantidad < 1)) {
      throw new CantidadPrecargaInvalidaException();
    }
    // Si dice que ya no lo tiene, exigimos que explique por qué -- queda
    // como trazabilidad para el supervisor/admin, no se puede dejar en blanco.
    if (estadoPrecarga === 'ya_no_lo_tiene' && (!observaciones || observaciones.trim() === '')) {
      throw new ObservacionesPrecargaRequeridasException();
    }
    const cantidadFinal = estadoPrecarga === 'confirmado' ? (cantidad as number) : 0;

    // La corrección de serial solo tiene sentido cuando el técnico dice que
    // SÍ tiene el ítem -- si dice que ya no lo tiene, no se toca (undefined =
    // no incluir en el PATCH, deja lo que había). Las observaciones sí se
    // escriben en ambos casos (opcionales al confirmar, obligatorias al negar).
    const serialFinal = estadoPrecarga === 'confirmado' ? serial : undefined;
    const observacionesFinal = observaciones;

    await this.respuestasRepository.actualizarEstadoPrecarga(
      respuestaId,
      estadoPrecarga,
      cantidadFinal,
      serialFinal,
      observacionesFinal,
    );

    const actualizado = await this.respuestasRepository.findByIdConDetalle(respuestaId);
    if (!actualizado) {
      throw new Error(`No se pudo releer la respuesta ${respuestaId} recién actualizada.`);
    }
    return actualizado;
  }
}
