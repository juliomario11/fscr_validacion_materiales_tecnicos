import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'fscr_validacion_materiales_admin_token_v1';
const STORAGE_KEY_USUARIO = 'fscr_validacion_materiales_admin_usuario_v1';

/**
 * Sesión del panel admin: un sistema de auth COMPLETAMENTE APARTE del de
 * empleados (`AuthService`). Acá no hay cookie httpOnly -- el backend
 * responde un JWT plano en el body (`POST /admin/auth/login`) que este
 * servicio guarda en memoria (signal) y en `localStorage` solo para
 * sobrevivir un refresh de página; `adminAuthInterceptor` lo adjunta como
 * `Authorization: Bearer <token>` en cada request hacia `/admin/*`.
 *
 * El `usuario` para mostrarlo en pantalla ("conectado como...") se guarda
 * tal cual se tipeó en el login -- no hace falta que el backend lo devuelva
 * de vuelta: si el login tuvo éxito, ya coincide exactamente con
 * `FSCR_ADMIN_USER` (comparación estricta en `LoginAdminUseCase`).
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly usuarioState = signal<string | null>(this.readStoredUsuario());

  public readonly token = this.tokenState.asReadonly();
  public readonly usuario = this.usuarioState.asReadonly();
  public readonly isAuthenticated = computed(() => this.tokenState() !== null);

  public login(usuario: string, password: string): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${environment.apiBaseUrl}/admin/auth/login`, { usuario, password })
      .pipe(tap((respuesta) => this.setSesion(respuesta.token, usuario)));
  }

  /** No hay endpoint de logout admin en el backend (no hace falta: no hay cookie que invalidar) -- basta con olvidar el token localmente. */
  public logout(): void {
    this.tokenState.set(null);
    this.usuarioState.set(null);
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    globalThis.localStorage?.removeItem(STORAGE_KEY_USUARIO);
  }

  private setSesion(token: string, usuario: string): void {
    this.tokenState.set(token);
    this.usuarioState.set(usuario);
    globalThis.localStorage?.setItem(STORAGE_KEY, token);
    globalThis.localStorage?.setItem(STORAGE_KEY_USUARIO, usuario);
  }

  private readStoredToken(): string | null {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  }

  private readStoredUsuario(): string | null {
    return globalThis.localStorage?.getItem(STORAGE_KEY_USUARIO) ?? null;
  }
}
