import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  MATERIALES_REPOSITORY,
  type MaterialesRepository,
} from '../../domain/repository/materiales.repository';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import {
  MaterialNoEncontradoException,
  RespuestaConfirmadaException,
} from '../exception/encuesta-materiales.exceptions';

export interface UpsertRespuestaInput {
  empleadoId: number;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
}

@Injectable()
export class UpsertRespuestaUseCase {
  public constructor(
    @Inject(MATERIALES_REPOSITORY)
    private readonly materialesRepository: MaterialesRepository,
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
  ) {}

  public async execute(input: UpsertRespuestaInput): Promise<RespuestaConDetalle> {
    const material = await this.materialesRepository.findActivoById(input.materialId);
    if (!material) {
      throw new MaterialNoEncontradoException();
    }

    const existente = await this.respuestasRepository.findByEmpleadoYMaterial(
      input.empleadoId,
      input.materialId,
    );

    if (existente) {
      if (existente.estado === 'confirmado') {
        // TODO: reabrir una encuesta confirmada (¿quién autoriza?, ¿se
        // audita el cambio?) queda pendiente de definir a futuro -- por
        // ahora la confirmación es definitiva, tal como pide el spec de
        // este primer scaffold.
        throw new RespuestaConfirmadaException();
      }
      await this.respuestasRepository.update(existente.id, {
        cantidad: input.cantidad,
        observaciones: input.observaciones,
      });
      return this.releerConDetalle(existente.id);
    }

    const creada = await this.respuestasRepository.insert({
      empleadoId: input.empleadoId,
      materialId: input.materialId,
      cantidad: input.cantidad,
      observaciones: input.observaciones,
    });
    return this.releerConDetalle(creada.id);
  }

  private async releerConDetalle(id: number): Promise<RespuestaConDetalle> {
    const detalle = await this.respuestasRepository.findByIdConDetalle(id);
    if (!detalle) {
      throw new Error(`No se pudo releer la respuesta ${id} recién escrita con su detalle.`);
    }
    return detalle;
  }
}
