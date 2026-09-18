import { Readable } from 'node:stream';

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

export interface ArchivoLeido {
  stream: Readable;
  mime: string;
  tamanoBytes: number;
}

/** Puerto de storage de adjuntos -- implementado por `FilesystemAdjuntosStorage` (disco del servidor, `DOCUMENTS_STORAGE_PATH`). */
export interface AdjuntosStoragePort {
  /** Sube el binario bajo `${cedula}/${respuestaId}/${archivoOpaco}` (dentro de `DOCUMENTS_STORAGE_PATH`) y devuelve la ruta relativa resultante. */
  subir(cedula: string, respuestaId: number, archivo: ArchivoASubir): Promise<ArchivoSubido>;
  /** Abre un stream de lectura para `storagePath` (el valor ya persistido en `inventario_adjuntos.storage_path`), para servirlo por HTTP. */
  leer(storagePath: string): Promise<ArchivoLeido>;
}
