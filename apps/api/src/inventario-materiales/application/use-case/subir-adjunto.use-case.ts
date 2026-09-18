import { Inject, Injectable } from '@nestjs/common';

import { AdjuntoInventario } from '../../domain/entity/adjunto-inventario.entity';
import {
  ADJUNTOS_INVENTARIO_REPOSITORY,
  type AdjuntosInventarioRepository,
} from '../../domain/repository/adjuntos-inventario.repository';
import {
  ADJUNTOS_STORAGE,
  type AdjuntosStoragePort,
} from '../../domain/repository/adjuntos-storage.port';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import {
  LimiteAdjuntosExcedidoException,
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/inventario-materiales.exceptions';

/** Tope defensivo -- evita que un empleado suba una cantidad desmedida de evidencia para un solo material. */
export const MAX_ADJUNTOS_POR_RESPUESTA = 5;

export interface SubirAdjuntoInput {
  empleadoId: number;
  cedula: string;
  materialId: number;
  buffer: Buffer;
  nombreOriginal: string;
  mimeType: string;
}

@Injectable()
export class SubirAdjuntoUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
    @Inject(ADJUNTOS_INVENTARIO_REPOSITORY)
    private readonly adjuntosRepository: AdjuntosInventarioRepository,
    @Inject(ADJUNTOS_STORAGE)
    private readonly storage: AdjuntosStoragePort,
  ) {}

  public async execute(input: SubirAdjuntoInput): Promise<AdjuntoInventario> {
    const respuesta = await this.respuestasRepository.findByEmpleadoYMaterial(
      input.empleadoId,
      input.materialId,
    );
    if (!respuesta) {
      throw new RespuestaNoEncontradaException(
        'Primero debes registrar una cantidad para este material antes de adjuntar evidencia.',
      );
    }
    if (respuesta.estado === 'confirmado') {
      throw new RespuestaConfirmadaException(
        'Esta respuesta ya fue confirmada y no admite nuevos adjuntos.',
      );
    }

    const yaSubidos = await this.adjuntosRepository.countByRespuestaId(respuesta.id);
    if (yaSubidos >= MAX_ADJUNTOS_POR_RESPUESTA) {
      throw new LimiteAdjuntosExcedidoException();
    }

    const subido = await this.storage.subir(input.cedula, respuesta.id, {
      buffer: input.buffer,
      nombreOriginal: input.nombreOriginal,
      mimeType: input.mimeType,
    });

    return this.adjuntosRepository.create({
      respuestaId: respuesta.id,
      storagePath: subido.storagePath,
      nombreArchivo: input.nombreOriginal,
      tipoMime: input.mimeType || null,
      tamanoBytes: subido.tamanoBytes,
    });
  }
}
