import { Inject, Injectable } from '@nestjs/common';

import {
  ADJUNTOS_ENCUESTA_REPOSITORY,
  type AdjuntosEncuestaRepository,
} from '../../domain/repository/adjuntos-encuesta.repository';
import {
  ADJUNTOS_STORAGE,
  type AdjuntosStoragePort,
  type ArchivoLeido,
} from '../../domain/repository/adjuntos-storage.port';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import { AdjuntoNoEncontradoException } from '../exception/encuesta-materiales.exceptions';

export interface DescargarAdjuntoResult extends ArchivoLeido {
  nombreArchivo: string;
}

@Injectable()
export class DescargarAdjuntoUseCase {
  public constructor(
    @Inject(ADJUNTOS_ENCUESTA_REPOSITORY)
    private readonly adjuntosRepository: AdjuntosEncuestaRepository,
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
    @Inject(ADJUNTOS_STORAGE)
    private readonly storage: AdjuntosStoragePort,
  ) {}

  /**
   * Mismo mensaje/código (404) tanto si el adjunto no existe como si existe
   * pero pertenece a la respuesta de OTRO empleado -- no debe revelarse cuál
   * de los dos casos es (evita enumerar ids de adjuntos ajenos).
   */
  public async execute(empleadoId: number, adjuntoId: number): Promise<DescargarAdjuntoResult> {
    const adjunto = await this.adjuntosRepository.findById(adjuntoId);
    if (!adjunto) {
      throw new AdjuntoNoEncontradoException();
    }
    const respuesta = await this.respuestasRepository.findByIdConDetalle(adjunto.respuestaId);
    if (!respuesta || respuesta.empleadoId !== empleadoId) {
      throw new AdjuntoNoEncontradoException();
    }

    const archivo = await this.storage.leer(adjunto.storagePath);
    return { ...archivo, nombreArchivo: adjunto.nombreArchivo };
  }
}
