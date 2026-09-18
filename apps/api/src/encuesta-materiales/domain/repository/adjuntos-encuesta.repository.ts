import { AdjuntoEncuesta } from '../entity/adjunto-encuesta.entity';

export const ADJUNTOS_ENCUESTA_REPOSITORY = Symbol('ADJUNTOS_ENCUESTA_REPOSITORY');

export interface CrearAdjuntoPayload {
  respuestaId: number;
  storagePath: string;
  nombreArchivo: string;
  tipoMime: string | null;
  tamanoBytes: number | null;
}

export interface AdjuntosEncuestaRepository {
  /** Registra la metadata en `encuesta_adjuntos` -- el binario ya fue escrito en el disco del servidor por `AdjuntosStoragePort` antes de llamar aquí. */
  create(payload: CrearAdjuntoPayload): Promise<AdjuntoEncuesta>;
  findById(id: number): Promise<AdjuntoEncuesta | null>;
  /** Usado para aplicar el límite máximo de adjuntos por respuesta antes de subir uno nuevo. */
  countByRespuestaId(respuestaId: number): Promise<number>;
}
