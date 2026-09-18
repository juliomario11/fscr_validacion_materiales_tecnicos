import { Injectable } from '@angular/core';

/**
 * Definición de una columna a exportar. El header se imprime tal cual y `value`
 * extrae el valor por fila. Si el valor es número se serializa como número en
 * Excel (`<c><v>`); cualquier otro tipo se serializa como inline string.
 */
export interface XlsxColumn<T> {
  readonly header: string;
  readonly value: (row: T) => string | number | null | undefined;
}

/**
 * Opciones para `XlsxExportService.exportToXlsx`. Sin dependencias externas --
 * funciona en cualquier navegador moderno con `Blob`/`URL.createObjectURL`.
 */
export interface XlsxExportOptions<T> {
  readonly filename: string;
  readonly sheetName?: string;
  readonly columns: ReadonlyArray<XlsxColumn<T>>;
  readonly rows: ReadonlyArray<T>;
}

/**
 * Generador de archivos XLSX 100% client-side, sin dependencias externas --
 * mismo servicio, copiado tal cual, que ya usa en producción
 * `fscr_proveedores_factura` (apps/web-angular/.../xlsx-export.service.ts).
 * Se replica literal en vez de reinventar el formato: es el mismo patrón de
 * infraestructura del proyecto hermano, ya verificado con Excel/LibreOffice.
 *
 * - Estructura OOXML mínima (5 entries en el zip).
 * - Inline strings para cada celda de texto (`<c t="inlineStr"><is><t>...</t></c>`).
 * - Zip "stored" (método 0, sin compresión) construido a mano. Compatible con
 *   Excel, LibreOffice, Numbers y openpyxl.
 */
@Injectable({ providedIn: 'root' })
export class XlsxExportService {
  /**
   * Construye un XLSX en memoria, lo empaqueta como Blob y dispara la descarga
   * desde el navegador. Devuelve el Blob por si el caller necesita testearlo.
   */
  public exportToXlsx<T>(options: XlsxExportOptions<T>): Blob {
    const blob = this.buildBlob(options);
    triggerBrowserDownload(blob, ensureXlsxExtension(options.filename));
    return blob;
  }

  /** Igual que `exportToXlsx` pero sin disparar la descarga (útil para tests). */
  public buildBlob<T>(options: XlsxExportOptions<T>): Blob {
    const sheetName = sanitizeSheetName(options.sheetName ?? 'Hoja1');
    const sheetXml = buildSheetXml(options.columns, options.rows);
    const workbookXml = buildWorkbookXml(sheetName);
    const workbookRels = buildWorkbookRels();
    const rootRels = buildRootRels();
    const contentTypes = buildContentTypes();

    const entries: ReadonlyArray<ZipEntry> = [
      { path: '[Content_Types].xml', data: encodeUtf8(contentTypes) },
      { path: '_rels/.rels', data: encodeUtf8(rootRels) },
      { path: 'xl/workbook.xml', data: encodeUtf8(workbookXml) },
      { path: 'xl/_rels/workbook.xml.rels', data: encodeUtf8(workbookRels) },
      { path: 'xl/worksheets/sheet1.xml', data: encodeUtf8(sheetXml) },
    ];
    const bytes = buildZip(entries);
    // Copy into a fresh ArrayBuffer so the type matches DOM BlobPart strictly
    // (some lib.d.ts setups widen Uint8Array.buffer to ArrayBufferLike).
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return new Blob([copy], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}

interface ZipEntry {
  readonly path: string;
  readonly data: Uint8Array;
}

/** Escapa caracteres especiales para inclusión como texto XML. */
function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return ch;
    }
  });
}

function sanitizeSheetName(name: string): string {
  // Excel: sheet names <=31 chars, no `[]:*?/\`.
  const cleaned = name.replace(/[\\\\\/\?\*\[\]:]/g, '').slice(0, 31);
  return cleaned.length === 0 ? 'Hoja1' : cleaned;
}

function ensureXlsxExtension(name: string): string {
  return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`;
}

/** Convierte índice 0-based a letra de columna Excel (0 → A, 25 → Z, 26 → AA…). */
function columnLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function buildSheetXml<T>(
  columns: ReadonlyArray<XlsxColumn<T>>,
  rows: ReadonlyArray<T>,
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  lines.push(
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  );
  lines.push('<sheetData>');

  // Header row (row 1).
  lines.push('<row r="1">');
  columns.forEach((col, i) => {
    const ref = `${columnLetter(i)}1`;
    lines.push(
      `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(col.header)}</t></is></c>`,
    );
  });
  lines.push('</row>');

  // Data rows (from row 2).
  rows.forEach((row, rowIdx) => {
    const r = rowIdx + 2;
    lines.push(`<row r="${r}">`);
    columns.forEach((col, colIdx) => {
      const ref = `${columnLetter(colIdx)}${r}`;
      const value = col.value(row);
      if (value === null || value === undefined || value === '') {
        // Skip empty cells: Excel happily ignores them (sparse rows are valid).
        return;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        lines.push(`<c r="${ref}"><v>${value}</v></c>`);
      } else {
        const s = typeof value === 'number' ? String(value) : String(value);
        lines.push(
          `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(s)}</t></is></c>`,
        );
      }
    });
    lines.push('</row>');
  });

  lines.push('</sheetData>');
  lines.push('</worksheet>');
  return lines.join('');
}

function buildWorkbookXml(sheetName: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' +
    `<sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>` +
    '</sheets>' +
    '</workbook>'
  );
}

function buildWorkbookRels(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
    'Target="worksheets/sheet1.xml"/>' +
    '</Relationships>'
  );
}

function buildRootRels(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
    'Target="xl/workbook.xml"/>' +
    '</Relationships>'
  );
}

function buildContentTypes(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>'
  );
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

// ---- ZIP writer (STORED method, sin compresión) ----

const CRC32_TABLE: ReadonlyArray<number> = (() => {
  const table: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface BuiltEntry {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly crc: number;
  readonly localHeaderOffset: number;
}

function buildZip(entries: ReadonlyArray<ZipEntry>): Uint8Array {
  // Two-pass: 1) compute sizes; 2) write into a single Uint8Array.
  const built: BuiltEntry[] = [];
  let cursor = 0;
  for (const entry of entries) {
    const pathBytes = encodeUtf8(entry.path);
    const crc = crc32(entry.data);
    const offset = cursor;
    // Local file header = 30 bytes fixed + filename + data
    cursor += 30 + pathBytes.length + entry.data.length;
    built.push({ path: entry.path, bytes: entry.data, crc, localHeaderOffset: offset });
  }
  const centralDirStart = cursor;
  for (const entry of built) {
    const pathBytes = encodeUtf8(entry.path);
    // Central directory header = 46 bytes + filename
    cursor += 46 + pathBytes.length;
  }
  const centralDirSize = cursor - centralDirStart;
  const eocdStart = cursor;
  cursor += 22;

  const out = new Uint8Array(cursor);
  const view = new DataView(out.buffer);
  let pos = 0;

  // Local file headers + file data
  for (const entry of built) {
    const pathBytes = encodeUtf8(entry.path);
    // Local file header signature 0x04034b50
    view.setUint32(pos, 0x04034b50, true); pos += 4;
    // Version needed to extract
    view.setUint16(pos, 20, true); pos += 2;
    // General purpose bit flag
    view.setUint16(pos, 0, true); pos += 2;
    // Compression method: 0 = stored
    view.setUint16(pos, 0, true); pos += 2;
    // Last mod file time + date (fixed 1980-01-01 00:00)
    view.setUint16(pos, 0, true); pos += 2;
    view.setUint16(pos, 0x0021, true); pos += 2;
    // CRC32
    view.setUint32(pos, entry.crc, true); pos += 4;
    // Compressed size = uncompressed size (stored)
    view.setUint32(pos, entry.bytes.length, true); pos += 4;
    view.setUint32(pos, entry.bytes.length, true); pos += 4;
    // Filename length
    view.setUint16(pos, pathBytes.length, true); pos += 2;
    // Extra field length
    view.setUint16(pos, 0, true); pos += 2;
    // Filename
    out.set(pathBytes, pos); pos += pathBytes.length;
    // File data
    out.set(entry.bytes, pos); pos += entry.bytes.length;
  }

  // Central directory
  for (const entry of built) {
    const pathBytes = encodeUtf8(entry.path);
    // Central directory header signature 0x02014b50
    view.setUint32(pos, 0x02014b50, true); pos += 4;
    // Version made by
    view.setUint16(pos, 0x031e, true); pos += 2;
    // Version needed
    view.setUint16(pos, 20, true); pos += 2;
    // General purpose bit flag
    view.setUint16(pos, 0, true); pos += 2;
    // Compression method
    view.setUint16(pos, 0, true); pos += 2;
    // File last mod time/date
    view.setUint16(pos, 0, true); pos += 2;
    view.setUint16(pos, 0x0021, true); pos += 2;
    // CRC32
    view.setUint32(pos, entry.crc, true); pos += 4;
    // Compressed size
    view.setUint32(pos, entry.bytes.length, true); pos += 4;
    // Uncompressed size
    view.setUint32(pos, entry.bytes.length, true); pos += 4;
    // Filename length
    view.setUint16(pos, pathBytes.length, true); pos += 2;
    // Extra field length
    view.setUint16(pos, 0, true); pos += 2;
    // Comment length
    view.setUint16(pos, 0, true); pos += 2;
    // Disk number start
    view.setUint16(pos, 0, true); pos += 2;
    // Internal file attributes
    view.setUint16(pos, 0, true); pos += 2;
    // External file attributes
    view.setUint32(pos, 0, true); pos += 4;
    // Relative offset of local header
    view.setUint32(pos, entry.localHeaderOffset, true); pos += 4;
    // Filename
    out.set(pathBytes, pos); pos += pathBytes.length;
  }

  // End of central directory record
  view.setUint32(pos, 0x06054b50, true); pos += 4;
  // Number of this disk
  view.setUint16(pos, 0, true); pos += 2;
  // Disk where central directory starts
  view.setUint16(pos, 0, true); pos += 2;
  // Number of central directory records on this disk
  view.setUint16(pos, built.length, true); pos += 2;
  // Total number of central directory records
  view.setUint16(pos, built.length, true); pos += 2;
  // Size of central directory
  view.setUint32(pos, centralDirSize, true); pos += 4;
  // Offset of start of central directory
  view.setUint32(pos, centralDirStart, true); pos += 4;
  // Comment length
  view.setUint16(pos, 0, true); pos += 2;

  // Sanity: eocdStart should equal centralDirStart + centralDirSize.
  if (eocdStart !== centralDirStart + centralDirSize) {
    throw new Error('XLSX zip writer offset mismatch');
  }
  return out;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
