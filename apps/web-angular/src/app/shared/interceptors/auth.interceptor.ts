import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * - Adjunta `withCredentials: true` a toda petición: la sesión viaja en una
 *   cookie httpOnly puesta por el backend en `/auth/login`, así que el
 *   navegador debe enviarla en cada request (no hay Bearer que adjuntar acá).
 * - Si el backend responde 401 (cookie ausente/expirada/inválida), limpia el
 *   estado local de sesión y manda al usuario a /login, sin importar en qué
 *   pantalla estaba.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const withCredentials = request.clone({ withCredentials: true });

  return next(withCredentials).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.clearSession();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
