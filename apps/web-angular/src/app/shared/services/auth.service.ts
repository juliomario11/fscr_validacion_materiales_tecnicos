import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth-user';

const STORAGE_KEY = 'fscr_validacion_materiales_session_v1';

/**
 * La sesión real vive en una cookie httpOnly que este servicio nunca puede
 * leer ni escribir directamente (por diseño: el JS del navegador no accede a
 * cookies httpOnly). Lo que sí guardamos localmente es el `AuthUser` devuelto
 * por login, solo para: (a) que `authGuard` decida sin llamadas de red y
 * (b) mostrar el nombre del técnico en pantalla tras un refresh.
 *
 * La fuente de verdad sigue siendo el backend: si la cookie expiró o es
 * inválida, la primera petición protegida devolverá 401 y
 * `shared/interceptors/auth.interceptor.ts` limpiará este estado local y
 * redirigirá a /login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly userState = signal<AuthUser | null>(this.readStoredUser());

  public readonly user = this.userState.asReadonly();
  public readonly isAuthenticated = computed(() => this.userState() !== null);

  public login(cedula: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${environment.apiBaseUrl}/auth/login`, { cedula })
      .pipe(tap((user) => this.setUser(user)));
  }

  /**
   * Intenta invalidar la cookie en el backend (`POST /auth/logout`). Si ese
   * endpoint todavía no existe o falla, igual limpiamos el estado local para
   * que la UI vuelva a /login; la cookie expirará por su cuenta.
   */
  public logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/logout`, {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
    );
  }

  public clearSession(): void {
    this.userState.set(null);
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  }

  private setUser(user: AuthUser): void {
    this.userState.set(user);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
