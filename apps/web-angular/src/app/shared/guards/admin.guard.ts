import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Protege `/admin/empleados` y `/admin/respuestas`. Completamente
 * independiente de `authGuard` (empleados): revisa el token Bearer en
 * memoria de `AdminAuthService`, no la sesión de empleado.
 */
export const adminGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuth.isAuthenticated()) return true;
  return router.createUrlTree(['/admin/login']);
};
