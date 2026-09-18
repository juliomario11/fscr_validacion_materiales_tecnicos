import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { AdjuntoInvalidoException } from '../../application/exception/inventario-materiales.exceptions';
import {
  ALLOWED_FILE_TYPES,
  MAX_ADJUNTO_BYTES,
  assertSafeOriginalName,
  buildStorageId,
  ensureAllowedExtension,
  ensureMimeMatchesExtension,
  getExtension,
  resolveInsideBase,
  sanitizeCedulaParaCarpeta,
} from '../../application/services/adjunto-validation';
import {
  AdjuntosStoragePort,
  ArchivoASubir,
  ArchivoLeido,
  ArchivoSubido,
} from '../../domain/repository/adjuntos-storage.port';

const DEFAULT_RELATIVE_DIR = path.join('storage', 'adjuntos-inventario');

function readableSize(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`;
}

/**
 * Sube adjuntos al filesystem del servidor -- mismo criterio que
 * `FilesystemDocumentStorage` de fscr_proveedores_factura: el directorio
 * base sale de `DOCUMENTS_STORAGE_PATH` (debe apuntar a disco persistente
 * en producción, ej. `/var/lib/fscr/adjuntos_inventario_tecnicos`), o a una
 * ruta relativa por defecto (efímera, `storage/adjuntos-inventario`) si no se
 * define -- pensada solo para desarrollo local.
 */
@Injectable()
export class FilesystemAdjuntosStorage implements AdjuntosStoragePort {
  private readonly logger = new Logger(FilesystemAdjuntosStorage.name);
  private readonly baseDir: string;

  public constructor() {
    const raw = process.env.DOCUMENTS_STORAGE_PATH ?? DEFAULT_RELATIVE_DIR;
    this.baseDir = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
      this.logger.log(`[storage] Directorio de adjuntos: ${this.baseDir}`);
    } catch (err) {
      this.logger.error(`[storage] No se pudo crear el directorio ${this.baseDir}: ${String(err)}`);
      throw err;
    }
  }

  public async subir(
    cedula: string,
    respuestaId: number,
    archivo: ArchivoASubir,
  ): Promise<ArchivoSubido> {
    if (!archivo.buffer || archivo.buffer.length === 0) {
      throw new AdjuntoInvalidoException('El archivo está vacío');
    }
    if (archivo.buffer.length > MAX_ADJUNTO_BYTES) {
      throw new AdjuntoInvalidoException(
        `El archivo excede el tamaño máximo permitido (${readableSize(MAX_ADJUNTO_BYTES)})`,
      );
    }

    assertSafeOriginalName(archivo.nombreOriginal);
    const allowed = ensureAllowedExtension(archivo.nombreOriginal);
    await ensureMimeMatchesExtension(archivo.buffer, allowed);

    const nombreArchivo = buildStorageId(archivo.nombreOriginal, allowed);
    // Se guarda con `/` literal (path.posix) independientemente del SO --
    // es el valor que persiste en `inventario_adjuntos.storage_path`. Carpeta
    // de primer nivel por cédula (no por el id interno del empleado) para
    // que el filesystem del servidor sea legible por un humano.
    const carpetaEmpleado = sanitizeCedulaParaCarpeta(cedula);
    const relativePath = path.posix.join(carpetaEmpleado, String(respuestaId), nombreArchivo);
    const destino = resolveInsideBase(this.baseDir, relativePath);

    await fs.promises.mkdir(path.dirname(destino), { recursive: true });
    await fs.promises.writeFile(destino, archivo.buffer, { flag: 'wx', mode: 0o640 });

    return { storagePath: relativePath, tamanoBytes: archivo.buffer.length };
  }

  public async leer(storagePath: string): Promise<ArchivoLeido> {
    const filePath = resolveInsideBase(this.baseDir, storagePath);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AdjuntoInvalidoException('El archivo ya no está disponible en el almacenamiento.');
      }
      throw err;
    }
    if (!stat.isFile()) {
      throw new AdjuntoInvalidoException('El archivo ya no está disponible en el almacenamiento.');
    }
    const ext = getExtension(storagePath);
    const allowed = ALLOWED_FILE_TYPES.find((t) => t.ext === ext);
    const mime = allowed?.mime ?? 'application/octet-stream';
    return { stream: fs.createReadStream(filePath), mime, tamanoBytes: stat.size };
  }
}
