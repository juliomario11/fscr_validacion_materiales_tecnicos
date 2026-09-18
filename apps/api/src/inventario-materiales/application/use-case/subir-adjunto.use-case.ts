import { Inject, Injectable } from '@nestjs/common';

import { AdjuntoInventario } from '../../domain/entity/adjunto-inventario.entity';
import { EstadoRespuestaInventario } from '../../domain/entity/respuesta-inventario.entity';
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

export interface SubirAdjuntoPrecargaInput {
  empleadoId: number;
  cedula: string;
  respuestaId: number;
  buffer: Buffer;
  nombreOriginal: string;
  mimeType: string;
}

interface ArchivoCrudo {
  cedula: string;
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

  /** Flujo MANUAL: resuelve la fila `origen='manual'` de ese material. */
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
    return this.subirParaRespuesta(respuesta.id, respuesta.estado, input);
  }

  /** Flujo PRECARGA: la fila ya existe (se materializó al loguearse) -- se identifica directo por su id, validando dueño y origen. */
  public async executeParaPrecarga(input: SubirAdjuntoPrecargaInput): Promise<AdjuntoInventario> {
    const respuesta = await this.respuestasRepository.findByIdConDetalle(input.respuestaId);
    if (!respuesta || respuesta.empleadoId !== input.empleadoId || respuesta.origen !== 'precargado') {
      throw new RespuestaNoEncontradaException();
    }
    return this.subirParaRespuesta(respuesta.id, respuesta.estado, input);
  }

  private async subirParaRespuesta(
    respuestaId: number,
    estado: EstadoRespuestaInventario,
    input: ArchivoCrudo,
  ): Promise<AdjuntoInventario> {
    if (estado === 'confirmado') {
      throw new RespuestaConfirmadaException('Esta respuesta ya fue confirmada y no admite nuevos adjuntos.');
    }

    const yaSubidos = await this.adjuntosRepository.countByRespuestaId(respuestaId);
    if (yaSubidos >= MAX_ADJUNTOS_POR_RESPUESTA) {
      throw new LimiteAdjuntosExcedidoException();
    }

    const subido = await this.storage.subir(input.cedula, respuestaId, {
      buffer: input.buffer,
      nombreOriginal: input.nombreOriginal,
      mimeType: input.mimeType,
    });

    return this.adjuntosRepository.create({
      respuestaId,
      storagePath: subido.storagePath,
      nombreArchivo: input.nombreOriginal,
      tipoMime: input.mimeType || null,
      tamanoBytes: subido.tamanoBytes,
    });
  }
}
