import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminRespuesta } from '../models/admin-respuesta';

/** Datos del panel admin (`GET /admin/respuestas`, requiere Bearer admin vía `adminAuthInterceptor`). */
@Injectable({ providedIn: 'root' })
export class AdminRespuestasService {
  private readonly http = inject(HttpClient);

  private readonly respuestasState = signal<AdminRespuesta[]>([]);
  public readonly respuestas = this.respuestasState.asReadonly();

  public cargarRespuestas(): Observable<AdminRespuesta[]> {
    return this.http
      .get<AdminRespuesta[]>(`${environment.apiBaseUrl}/admin/respuestas`)
      .pipe(tap((respuestas) => this.respuestasState.set(respuestas)));
  }
}
