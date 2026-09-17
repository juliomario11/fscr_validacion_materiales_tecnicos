export const ADJUNTOS_STORAGE = Symbol('ADJUNTOS_STORAGE');

export interface ArchivoASubir {
  buffer: Buffer;
  nombreOriginal: string;
  mimeType: string;
}

export interface ArchivoSubido {
  storagePath: string;
  tamanoBytes: number;
}

/** Puerto de storage de adjuntos -- implementado por `SupabaseStorageAdapter` (bucket privado `validacion-materiales-adjuntos`). */
export interface AdjuntosStoragePort {
  /** Sube el binario bajo `${empleadoId}/${respuestaId}/${timestamp}-${nombreSlug}` y devuelve la ruta resultante dentro del bucket. */
  subir(empleadoId: number, respuestaId: number, archivo: ArchivoASubir): Promise<ArchivoSubido>;
}
