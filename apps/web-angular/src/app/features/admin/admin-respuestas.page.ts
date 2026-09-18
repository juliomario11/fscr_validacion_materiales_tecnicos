import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';

import { AdjuntoRespuesta } from '../../shared/models/adjunto-respuesta';
import { AdminRespuesta } from '../../shared/models/admin-respuesta';
import { AdminAuthService } from '../../shared/services/admin-auth.service';
import { AdminRespuestasService } from '../../shared/services/admin-respuestas.service';
import { XlsxExportService } from '../../shared/services/xlsx-export.service';
import { formatFechaCorta } from '../../shared/utils/formato-fecha';
import { timestampArchivo } from '../../shared/utils/timestamp-archivo';

type TipoPreview = 'imagen' | 'pdf';

@Component({
  selector: 'app-admin-respuestas-page',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './admin-respuestas.page.html',
  styleUrl: './admin-respuestas.page.scss',
})
export class AdminRespuestasPage implements OnInit, OnDestroy {
  protected readonly adminAuth = inject(AdminAuthService);
  private readonly respuestasService = inject(AdminRespuestasService);
  private readonly xlsxExport = inject(XlsxExportService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly respuestas = this.respuestasService.respuestas;
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly filtroTexto = signal('');

  /** Filtro de texto libre (cédula, nombre o material) -- puramente client-side, no vuelve a pedir nada al backend. */
  protected readonly respuestasFiltradas = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const todas = this.respuestas();
    if (!texto) return todas;
    return todas.filter(
      (respuesta) =>
        respuesta.empleado.cedula.toLowerCase().includes(texto) ||
        respuesta.empleado.nombreCompleto.toLowerCase().includes(texto) ||
        respuesta.material.codigo.toLowerCase().includes(texto) ||
        respuesta.material.descripcion.toLowerCase().includes(texto),
    );
  });

  /** Conteos para la barra de resumen -- sobre TODAS las respuestas, no sobre el filtro de texto (para que siempre reflejen el estado real). */
  protected readonly resumen = computed(() => {
    const todas = this.respuestas();
    return {
      total: todas.length,
      confirmados: todas.filter((respuesta) => respuesta.estado === 'confirmado').length,
      borrador: todas.filter((respuesta) => respuesta.estado === 'borrador').length,
      precargaSinValidar: todas.filter(
        (respuesta) => respuesta.origen === 'precargado' && respuesta.estadoPrecarga === null,
      ).length,
      serialConDiscrepancia: todas.filter(
        (respuesta) => !!respuesta.serialSistema && !!respuesta.serial && respuesta.serialSistema !== respuesta.serial,
      ).length,
      fueraDeFecha: todas.filter((respuesta) => respuesta.fueraDeFecha).length,
    };
  });

  protected readonly procesandoAdjuntoId = signal<number | null>(null);
  protected readonly errorAdjunto = signal<string | null>(null);

  protected readonly previewNombre = signal<string | null>(null);
  protected readonly previewTipo = signal<TipoPreview | null>(null);
  private previewObjectUrl: string | null = null;
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly previewSafeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.previewUrl();
    if (!url || this.previewTipo() !== 'pdf') return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  public ngOnInit(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.respuestasService.cargarRespuestas().subscribe({
      next: () => this.cargando.set(false),
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No fue posible cargar las respuestas. Intenta nuevamente.');
      },
    });
  }

  public ngOnDestroy(): void {
    this.liberarPreviewUrl();
  }

  /**
   * Mismo patrón que `InventarioPage.verAdjunto` (y el módulo de
   * facturación de fscr_proveedores_factura, del que se copió este
   * patrón): descarga el binario como blob y lo muestra en un modal --
   * imagen o iframe de PDF según la extensión. El admin puede ver el
   * adjunto de CUALQUIER empleado.
   */
  protected verAdjunto(adjunto: AdjuntoRespuesta): void {
    if (this.procesandoAdjuntoId()) return;
    this.errorAdjunto.set(null);
    this.procesandoAdjuntoId.set(adjunto.id);

    this.respuestasService.descargarAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        this.procesandoAdjuntoId.set(null);
        this.liberarPreviewUrl();
        const url = URL.createObjectURL(blob);
        this.previewObjectUrl = url;
        this.previewUrl.set(url);
        this.previewNombre.set(adjunto.nombreArchivo);
        this.previewTipo.set(this.esPdf(adjunto.nombreArchivo) ? 'pdf' : 'imagen');
      },
      error: () => {
        this.procesandoAdjuntoId.set(null);
        this.errorAdjunto.set('No fue posible cargar la vista previa del adjunto.');
      },
    });
  }

  protected cerrarPreview(): void {
    this.liberarPreviewUrl();
    this.previewUrl.set(null);
    this.previewNombre.set(null);
    this.previewTipo.set(null);
  }

  /** Mismo fetch por blob que `verAdjunto`, pero fuerza la descarga con un `<a download>` temporal. */
  protected descargarAdjunto(adjunto: AdjuntoRespuesta): void {
    if (this.procesandoAdjuntoId()) return;
    this.errorAdjunto.set(null);
    this.procesandoAdjuntoId.set(adjunto.id);

    this.respuestasService.descargarAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        this.procesandoAdjuntoId.set(null);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = adjunto.nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.procesandoAdjuntoId.set(null);
        this.errorAdjunto.set('No fue posible descargar el adjunto.');
      },
    });
  }

  private liberarPreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private esPdf(nombreArchivo: string): boolean {
    return nombreArchivo.toLowerCase().endsWith('.pdf');
  }

  protected exportar(): void {
    this.xlsxExport.exportToXlsx<AdminRespuesta>({
      filename: `respuestas-inventario-materiales-${timestampArchivo()}`,
      sheetName: 'Respuestas',
      columns: [
        { header: 'Cédula', value: (fila) => fila.empleado.cedula },
        { header: 'Nombre completo', value: (fila) => fila.empleado.nombreCompleto },
        { header: 'Código material', value: (fila) => fila.material.codigo },
        { header: 'Descripción', value: (fila) => fila.material.descripcion },
        { header: 'Categoría', value: (fila) => fila.material.categoria },
        { header: 'Cantidad', value: (fila) => fila.cantidad },
        { header: 'Unidad', value: (fila) => fila.material.unidadMedida },
        { header: 'Serial (sistema)', value: (fila) => fila.serialSistema },
        { header: 'Serial (reportado)', value: (fila) => fila.serial },
        { header: 'Observaciones', value: (fila) => fila.observaciones },
        { header: 'Origen', value: (fila) => (fila.origen === 'precargado' ? 'Precargado' : 'Manual') },
        {
          header: 'Estado precarga',
          value: (fila) =>
            fila.origen !== 'precargado'
              ? null
              : fila.estadoPrecarga === 'confirmado'
                ? 'Confirmado'
                : fila.estadoPrecarga === 'ya_no_lo_tiene'
                  ? 'Ya no lo tiene'
                  : 'Sin validar',
        },
        { header: 'Cantidad precargada (cron)', value: (fila) => fila.cantidadPrecargada },
        { header: 'Estado', value: (fila) => (fila.estado === 'confirmado' ? 'Confirmado' : 'Borrador') },
        { header: 'Fuera de fecha', value: (fila) => (fila.fueraDeFecha ? 'Sí' : 'No') },
        { header: 'Adjuntos', value: (fila) => fila.cantidadAdjuntos },
        { header: 'Fecha inicio', value: (fila) => formatFechaCorta(fila.fechaInicio) },
        { header: 'Fecha confirmación', value: (fila) => formatFechaCorta(fila.fechaConfirmacion) },
      ],
      rows: this.respuestas(),
    });
  }

  protected cerrarSesion(): void {
    this.adminAuth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
