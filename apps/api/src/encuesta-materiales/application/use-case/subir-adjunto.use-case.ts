import { Inject, Injectable } from '@nestjs/common';

import { AdjuntoEncuesta } from '../../domain/entity/adjunto-encuesta.entity';
import {
  ADJUNTOS_ENCUESTA_REPOSITORY,
  type AdjuntosEncuestaRepository,
} from '../../domain/repository/adjuntos-encuesta.repository';
import {
  ADJUNTOS_STORAGE,
  type AdjuntosStoragePort,
} from '../../domain/repository/adjuntos-storage.port';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import {
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
} from '../exception/encuesta-materiales.exceptions';

export interface SubirAdjuntoInput {
  empleadoId: number;
  materialId: number;
  buffer: Buffer;
  nombreOriginal: string;
  mimeType: string;
}

@Injectable()
export class SubirAdjuntoUseCase {
  public constructor(
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
    @Inject(ADJUNTOS_ENCUESTA_REPOSITORY)
    private readonly adjuntosRepository: AdjuntosEncuestaRepository,
    @Inject(ADJUNTOS_STORAGE)
    private readonly storage: AdjuntosStoragePort,
  ) {}

  public async execute(input: SubirAdjuntoInput): Promise<AdjuntoEncuesta> {
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

    const subido = await this.storage.subir(input.empleadoId, respuesta.id, {
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
