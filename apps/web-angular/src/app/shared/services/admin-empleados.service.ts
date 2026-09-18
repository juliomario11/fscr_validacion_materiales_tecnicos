import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminEmpleado } from '../models/admin-empleado';

/** Datos del panel admin (`GET /admin/empleados`, requiere Bearer admin vía `adminAuthInterceptor`). */
@Injectable({ providedIn: 'root' })
export class AdminEmpleadosService {
  private readonly http = inject(HttpClient);

  private readonly empleadosState = signal<AdminEmpleado[]>([]);
  public readonly empleados = this.empleadosState.asReadonly();

  public cargarEmpleados(): Observable<AdminEmpleado[]> {
    return this.http
      .get<AdminEmpleado[]>(`${environment.apiBaseUrl}/admin/empleados`)
      .pipe(tap((empleados) => this.empleadosState.set(empleados)));
  }
}
