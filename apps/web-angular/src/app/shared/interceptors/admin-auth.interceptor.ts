import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Agrega `Authorization: Bearer <token>` SOLO a requests hacia `/admin/*`
 * (login, empleados, respuestas) -- nunca a los del flujo de empleado, que
 * usan cookie de sesión (ver `auth.interceptor.ts`, que a su vez ignora las
 * URLs `/admin/`). Si el backend responde 401 fuera del propio login admin,
 * limpia el token y manda a `/admin/login` (nunca a `/login`, que es el
 * login de empleados).
 */
export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.includes('/admin/')) return next(request);

  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  const token = adminAuth.token();
  const authenticated = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authenticated).pipe(
    catchError((error: unknown) => {
      const esLogin = request.url.includes('/admin/auth/login');
      if (!esLogin && error instanceof HttpErrorResponse && error.status === 401) {
        adminAuth.logout();
        void router.navigateByUrl('/admin/login');
      }
      return throwError(() => error);
    }),
  );
};
