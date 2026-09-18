import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'fscr_validacion_materiales_admin_token_v1';

/**
 * Sesión del panel admin: un sistema de auth COMPLETAMENTE APARTE del de
 * empleados (`AuthService`). Acá no hay cookie httpOnly -- el backend
 * responde un JWT plano en el body (`POST /admin/auth/login`) que este
 * servicio guarda en memoria (signal) y en `localStorage` solo para
 * sobrevivir un refresh de página; `adminAuthInterceptor` lo adjunta como
 * `Authorization: Bearer <token>` en cada request hacia `/admin/*`.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenState = signal<string | null>(this.readStoredToken());

  public readonly token = this.tokenState.asReadonly();
  public readonly isAuthenticated = computed(() => this.tokenState() !== null);

  public login(usuario: string, password: string): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${environment.apiBaseUrl}/admin/auth/login`, { usuario, password })
      .pipe(tap((respuesta) => this.setToken(respuesta.token)));
  }

  /** No hay endpoint de logout admin en el backend (no hace falta: no hay cookie que invalidar) -- basta con olvidar el token localmente. */
  public logout(): void {
    this.tokenState.set(null);
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  }

  private setToken(token: string): void {
    this.tokenState.set(token);
    globalThis.localStorage?.setItem(STORAGE_KEY, token);
  }

  private readStoredToken(): string | null {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  }
}
