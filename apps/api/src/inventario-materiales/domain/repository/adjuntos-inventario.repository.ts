import { AdjuntoInventario } from '../entity/adjunto-inventario.entity';

export const ADJUNTOS_INVENTARIO_REPOSITORY = Symbol('ADJUNTOS_INVENTARIO_REPOSITORY');

export interface CrearAdjuntoPayload {
  respuestaId: number;
  storagePath: string;
  nombreArchivo: string;
  tipoMime: string | null;
  tamanoBytes: number | null;
}

export interface AdjuntosInventarioRepository {
  /** Registra la metadata en `inventario_adjuntos` -- el binario ya fue escrito en el disco del servidor por `AdjuntosStoragePort` antes de llamar aquí. */
  create(payload: CrearAdjuntoPayload): Promise<AdjuntoInventario>;
  findById(id: number): Promise<AdjuntoInventario | null>;
  /** Usado para aplicar el límite máximo de adjuntos por respuesta antes de subir uno nuevo. */
  countByRespuestaId(respuestaId: number): Promise<number>;
}
