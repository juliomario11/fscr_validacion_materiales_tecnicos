import { Injectable } from '@angular/core';

export interface ExportColumn<T> {
  readonly header: string;
  readonly value: (row: T) => string | number | null;
}

export interface ExportOptions<T> {
  readonly filename: string;
  readonly columns: ReadonlyArray<ExportColumn<T>>;
  readonly rows: ReadonlyArray<T>;
}

/**
 * Exportación "a Excel" 100% client-side, sin agregar ninguna librería al
 * proyecto (nada de `xlsx`/`exceljs` en package.json).
 *
 * DECISIÓN: se generó un CSV en vez de un .xlsx (OOXML) real. Un .xlsx
 * válido es, por dentro, un ZIP con varios XML (hoja, estilos, workbook,
 * `[Content_Types].xml`, relaciones...); implementar ese contenedor a mano
 * sin ninguna librería de compresión es mucho trabajo y frágil, para el
 * mismo resultado práctico que necesita este panel: tablas de solo lectura,
 * sin fórmulas ni múltiples hojas. Excel (y Sheets/LibreOffice) abren un CSV
 * con doble clic exactamente igual que un .xlsx para este caso de uso.
 *
 * El único cuidado real es la codificación: sin BOM, Excel en Windows suele
 * interpretar el CSV como ANSI/Latin1 y rompe tildes/ñ. Por eso se antepone
 * el BOM UTF-8 (`﻿`) al contenido del blob.
 */
@Injectable({ providedIn: 'root' })
export class XlsxExportService {
  /** Separador `;` (no `,`): en configuraciones regionales es-* (Colombia incluida), Excel usa `;` como separador de CSV, porque la coma la reserva para decimales. */
  private static readonly SEPARADOR = ';';

  public exportToCsv<T>({ filename, columns, rows }: ExportOptions<T>): void {
    const encabezado = columns
      .map((columna) => this.escaparCelda(columna.header))
      .join(XlsxExportService.SEPARADOR);
    const lineas = rows.map((fila) =>
      columns.map((columna) => this.escaparCelda(columna.value(fila))).join(XlsxExportService.SEPARADOR),
    );
    const contenido = [encabezado, ...lineas].join('\r\n');

    const BOM = '﻿';
    const blob = new Blob([BOM + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const nombreArchivo = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }

  private escaparCelda(valor: string | number | null): string {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    if (/["\r\n]/.test(texto) || texto.includes(XlsxExportService.SEPARADOR)) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }
}
