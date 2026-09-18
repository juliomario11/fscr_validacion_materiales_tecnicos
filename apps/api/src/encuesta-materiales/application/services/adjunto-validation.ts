import { randomBytes } from 'node:crypto';
import * as path from 'node:path';

import { fromBuffer as detectFileType } from 'file-type';

import { AdjuntoInvalidoException } from '../exception/encuesta-materiales.exceptions';

/**
 * Validaciones adaptadas de fscr_proveedores_factura
 * (application/services/document-validation.ts) -- mismo criterio de
 * seguridad (nombre de archivo seguro, extension + mime real verificados
 * con magic bytes via `file-type`, no confiar en el Content-Type del
 * cliente), catalogo de tipos permitidos ajustado a evidencia fotografica
 * de materiales en vez de documentos de facturacion.
 */

export interface AllowedFileType {
  ext: string;
  mime: string;
}

export const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILE_TYPES: ReadonlyArray<AllowedFileType> = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'pdf', mime: 'application/pdf' },
];

/** file-type siempre reporta ext:'jpg' para contenido JPEG, nunca 'jpeg' -- por eso .jpeg es alias de .jpg en el nombre original. */
const ALLOWED_EXTENSIONS = new Set([...ALLOWED_FILE_TYPES.map((t) => t.ext), 'jpeg']);

const SLUG_INVALID = /[^a-z0-9-]+/g;

export function assertSafeOriginalName(originalName: string): void {
  if (typeof originalName !== 'string') {
    throw new AdjuntoInvalidoException('El nombre del archivo es requerido');
  }
  const trimmed = originalName.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '..') {
    throw new AdjuntoInvalidoException('El nombre del archivo no es válido');
  }
  if (trimmed.includes('\0')) {
    throw new AdjuntoInvalidoException('El nombre del archivo contiene caracteres no permitidos');
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new AdjuntoInvalidoException('El nombre del archivo no puede contener separadores de ruta');
  }
  if (path.isAbsolute(trimmed)) {
    throw new AdjuntoInvalidoException('El nombre del archivo no puede ser una ruta absoluta');
  }
}

export function getExtension(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  if (dot < 0 || dot === originalName.length - 1) return '';
  return originalName.slice(dot + 1).toLowerCase();
}

/** Slug del nombre base: minusculas, sin acentos, solo [a-z0-9-]. Vacio -> 'archivo'. */
export function slugifyBaseName(base: string): string {
  let slug = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\./g, '-')
    .replace(SLUG_INVALID, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length === 0) slug = 'archivo';
  if (slug.length > 80) slug = slug.slice(0, 80).replace(/-+$/g, '');
  if (slug.length === 0) slug = 'archivo';
  return slug;
}

export function ensureAllowedExtension(originalName: string): AllowedFileType {
  const ext = getExtension(originalName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AdjuntoInvalidoException(
      `Extensión no permitida. Solo se aceptan: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    );
  }
  const lookupExt = ext === 'jpeg' ? 'jpg' : ext;
  const allowed = ALLOWED_FILE_TYPES.find((t) => t.ext === lookupExt);
  if (!allowed) {
    throw new AdjuntoInvalidoException('Extensión no permitida');
  }
  return allowed;
}

/**
 * Verifica que el contenido real (magic bytes) coincida con la extension
 * declarada -- no confia en el Content-Type que manda el cliente.
 */
export async function ensureMimeMatchesExtension(
  buffer: Buffer,
  expected: AllowedFileType,
): Promise<string> {
  const detected = await detectFileType(buffer);

  if (expected.ext === 'pdf') {
    if (!detected || detected.ext !== 'pdf' || detected.mime !== 'application/pdf') {
      throw new AdjuntoInvalidoException('El contenido del archivo no corresponde a un PDF válido');
    }
    return 'application/pdf';
  }
  if (expected.ext === 'png') {
    if (!detected || detected.ext !== 'png' || detected.mime !== 'image/png') {
      throw new AdjuntoInvalidoException('El contenido del archivo no corresponde a un PNG válido');
    }
    return 'image/png';
  }
  if (expected.ext === 'webp') {
    if (!detected || detected.ext !== 'webp' || detected.mime !== 'image/webp') {
      throw new AdjuntoInvalidoException('El contenido del archivo no corresponde a un WEBP válido');
    }
    return 'image/webp';
  }
  if (expected.ext === 'jpg') {
    if (!detected || detected.ext !== 'jpg' || detected.mime !== 'image/jpeg') {
      throw new AdjuntoInvalidoException('El contenido del archivo no corresponde a un JPG/JPEG válido');
    }
    return 'image/jpeg';
  }
  throw new AdjuntoInvalidoException('Extensión no permitida');
}

const CEDULA_INVALID = /[^a-zA-Z0-9-]+/g;

/**
 * Sanea la cédula para usarla como nombre de carpeta de primer nivel en el
 * storage de adjuntos (`DOCUMENTS_STORAGE_PATH/<cedula>/<respuestaId>/...`)
 * -- solo alfanumérico y guion. La cédula viene de la sesión firmada por el
 * servidor (no de un input directo del request), pero se sanea igual como
 * defensa en profundidad y para que el nombre de carpeta sea siempre legible
 * en disco.
 */
export function sanitizeCedulaParaCarpeta(cedula: string): string {
  const limpio = cedula.replace(CEDULA_INVALID, '');
  return limpio.length > 0 ? limpio : 'sin-cedula';
}

/**
 * Construye un id de archivo opaco: `<timestamp>-<rand>-<slug>.<ext>`.
 * `rand` sale de crypto.randomBytes (no Math.random) para que el handle no
 * sea adivinable -- mismo criterio que buildStorageId del proyecto hermano.
 */
export function buildStorageId(originalName: string, allowed: AllowedFileType): string {
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot >= 0 ? originalName.slice(0, lastDot) : originalName;
  const slug = slugifyBaseName(base);
  const ts = Date.now().toString(36);
  const rand = randomBytes(12).toString('hex');
  return `${ts}-${rand}-${slug}.${allowed.ext}`;
}

/**
 * Asegura que `relativePath` (puede incluir subcarpetas, ej.
 * `empleadoId/respuestaId/archivo.jpg`) resuelve dentro de `baseDir` --
 * previene path traversal (`..`) sin importar cuantos segmentos tenga.
 */
export function resolveInsideBase(baseDir: string, relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new AdjuntoInvalidoException('Ruta de archivo no válida');
  }
  if (relativePath.includes('\0')) {
    throw new AdjuntoInvalidoException('Ruta de archivo no válida');
  }
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  const rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
    throw new AdjuntoInvalidoException('Ruta de archivo no válida');
  }
  return resolved;
}
