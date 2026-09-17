import { Material } from './material.entity';
import { RespuestaEncuesta } from './respuesta-encuesta.entity';

/** Proyección de un adjunto para listados (sin `storagePath`/`tipoMime`/`tamanoBytes` -- esos son detalle de infraestructura, no de la respuesta HTTP). */
export interface AdjuntoResumen {
  id: number;
  nombreArchivo: string;
  subidoEn: string;
}

/**
 * `RespuestaEncuesta` + el material embebido (join por `material_id`) + sus
 * adjuntos -- forma que consumen `GET /mis-respuestas`, `PUT
 * /mis-respuestas/:materialId` y `POST /mis-respuestas/confirmar`, para que
 * el frontend no tenga que hacer un segundo round-trip a `GET /materiales`
 * por cada fila.
 */
export interface RespuestaConDetalle extends RespuestaEncuesta {
  material: Material;
  adjuntos: AdjuntoResumen[];
}
