/** Evidencia (foto/documento) subida por el empleado para una respuesta concreta (`encuesta_adjuntos`, ON DELETE CASCADE desde `encuesta_respuestas`). */
export interface AdjuntoEncuesta {
  id: number;
  respuestaId: number;
  storagePath: string;
  nombreArchivo: string;
  tipoMime: string | null;
  tamanoBytes: number | null;
  subidoEn: string;
}
