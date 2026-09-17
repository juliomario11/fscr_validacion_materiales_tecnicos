import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Material } from '../models/material';

@Injectable({ providedIn: 'root' })
export class MaterialesService {
  private readonly http = inject(HttpClient);

  private readonly catalogoState = signal<Material[]>([]);
  public readonly catalogo = this.catalogoState.asReadonly();

  public cargarCatalogo(): Observable<Material[]> {
    return this.http
      .get<Material[]>(`${environment.apiBaseUrl}/materiales`)
      .pipe(tap((materiales) => this.catalogoState.set(materiales)));
  }
}
