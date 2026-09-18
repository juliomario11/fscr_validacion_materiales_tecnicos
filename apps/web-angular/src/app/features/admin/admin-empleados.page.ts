import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminEmpleado } from '../../shared/models/admin-empleado';
import { AdminAuthService } from '../../shared/services/admin-auth.service';
import { AdminEmpleadosService } from '../../shared/services/admin-empleados.service';
import { XlsxExportService } from '../../shared/services/xlsx-export.service';

const ESTADO_LABEL: Record<AdminEmpleado['estado'], string> = {
  sin_iniciar: 'Sin iniciar',
  en_progreso: 'En progreso',
  confirmado: 'Confirmado',
};

@Component({
  selector: 'app-admin-empleados-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-empleados.page.html',
  styleUrl: './admin-empleados.page.scss',
})
export class AdminEmpleadosPage implements OnInit {
  protected readonly adminAuth = inject(AdminAuthService);
  private readonly empleadosService = inject(AdminEmpleadosService);
  private readonly xlsxExport = inject(XlsxExportService);
  private readonly router = inject(Router);

  protected readonly empleados = this.empleadosService.empleados;
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  public ngOnInit(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.empleadosService.cargarEmpleados().subscribe({
      next: () => this.cargando.set(false),
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No fue posible cargar los empleados. Intenta nuevamente.');
      },
    });
  }

  protected estadoLabel(estado: AdminEmpleado['estado']): string {
    return ESTADO_LABEL[estado];
  }

  protected exportar(): void {
    this.xlsxExport.exportToCsv<AdminEmpleado>({
      filename: 'empleados-encuesta-materiales',
      columns: [
        { header: 'Cédula', value: (fila) => fila.cedula },
        { header: 'Nombre completo', value: (fila) => fila.nombreCompleto },
        { header: 'Cargo', value: (fila) => fila.cargo },
        { header: 'Departamento', value: (fila) => fila.departamento },
        { header: 'Área', value: (fila) => fila.area },
        { header: 'Proyecto', value: (fila) => fila.proyecto },
        { header: 'Estado', value: (fila) => this.estadoLabel(fila.estado) },
        { header: 'Cantidad de ítems', value: (fila) => fila.cantidadItems },
        { header: 'Fecha de confirmación', value: (fila) => fila.fechaConfirmacion },
      ],
      rows: this.empleados(),
    });
  }

  protected cerrarSesion(): void {
    this.adminAuth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
