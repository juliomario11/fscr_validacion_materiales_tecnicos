/** Evidencia (foto/documento) subida por el empleado para una respuesta concreta (`inventario_adjuntos`, ON DELETE CASCADE desde `inventario_respuestas`). */
export interface AdjuntoInventario {
  id: number;
  respuestaId: number;
  storagePath: string;
  nombreArchivo: string;
  tipoMime: string | null;
  tamanoBytes: number | null;
  subidoEn: string;
}
