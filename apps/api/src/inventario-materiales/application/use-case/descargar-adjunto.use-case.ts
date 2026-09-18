import { Inject, Injectable } from '@nestjs/common';

import {
  ADJUNTOS_INVENTARIO_REPOSITORY,
  type AdjuntosInventarioRepository,
} from '../../domain/repository/adjuntos-inventario.repository';
import {
  ADJUNTOS_STORAGE,
  type AdjuntosStoragePort,
  type ArchivoLeido,
} from '../../domain/repository/adjuntos-storage.port';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import { AdjuntoNoEncontradoException } from '../exception/inventario-materiales.exceptions';

export interface DescargarAdjuntoResult extends ArchivoLeido {
  nombreArchivo: string;
}

@Injectable()
export class DescargarAdjuntoUseCase {
  public constructor(
    @Inject(ADJUNTOS_INVENTARIO_REPOSITORY)
    private readonly adjuntosRepository: AdjuntosInventarioRepository,
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
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

  /** Para el panel admin: sin chequeo de dueño -- el admin puede ver los adjuntos de CUALQUIER empleado. */
  public async executeAdmin(adjuntoId: number): Promise<DescargarAdjuntoResult> {
    const adjunto = await this.adjuntosRepository.findById(adjuntoId);
    if (!adjunto) {
      throw new AdjuntoNoEncontradoException();
    }
    const archivo = await this.storage.leer(adjunto.storagePath);
    return { ...archivo, nombreArchivo: adjunto.nombreArchivo };
  }
}
