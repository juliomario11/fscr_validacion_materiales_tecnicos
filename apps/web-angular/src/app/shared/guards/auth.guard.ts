import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Gate rápido en el cliente basado en el último `AuthUser` conocido (no en la
 * cookie httpOnly, que el JS no puede leer). Si el estado local dice que no
 * hay sesión, redirige a /login de una vez; si dice que sí la hay pero la
 * cookie ya expiró en el servidor, la primera petición dentro de /encuesta
 * devolverá 401 y el `authInterceptor` se encarga de sacar al usuario.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};
