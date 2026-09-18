import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminRespuesta } from '../../shared/models/admin-respuesta';
import { AdminAuthService } from '../../shared/services/admin-auth.service';
import { AdminRespuestasService } from '../../shared/services/admin-respuestas.service';
import { XlsxExportService } from '../../shared/services/xlsx-export.service';

@Component({
  selector: 'app-admin-respuestas-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-respuestas.page.html',
  styleUrl: './admin-respuestas.page.scss',
})
export class AdminRespuestasPage implements OnInit {
  protected readonly adminAuth = inject(AdminAuthService);
  private readonly respuestasService = inject(AdminRespuestasService);
  private readonly xlsxExport = inject(XlsxExportService);
  private readonly router = inject(Router);

  protected readonly respuestas = this.respuestasService.respuestas;
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

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

  protected exportar(): void {
    this.xlsxExport.exportToXlsx<AdminRespuesta>({
      filename: 'respuestas-encuesta-materiales',
      sheetName: 'Respuestas',
      columns: [
        { header: 'Cédula', value: (fila) => fila.empleado.cedula },
        { header: 'Nombre completo', value: (fila) => fila.empleado.nombreCompleto },
        { header: 'Código material', value: (fila) => fila.material.codigo },
        { header: 'Descripción', value: (fila) => fila.material.descripcion },
        { header: 'Categoría', value: (fila) => fila.material.categoria },
        { header: 'Cantidad', value: (fila) => fila.cantidad },
        { header: 'Unidad', value: (fila) => fila.material.unidadMedida },
        { header: 'Observaciones', value: (fila) => fila.observaciones },
        { header: 'Estado', value: (fila) => (fila.estado === 'confirmado' ? 'Confirmado' : 'Borrador') },
        { header: 'Adjuntos', value: (fila) => fila.cantidadAdjuntos },
        { header: 'Fecha inicio', value: (fila) => fila.fechaInicio },
        { header: 'Fecha confirmación', value: (fila) => fila.fechaConfirmacion },
      ],
      rows: this.respuestas(),
    });
  }

  protected cerrarSesion(): void {
    this.adminAuth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
