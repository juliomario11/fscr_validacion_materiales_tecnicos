import { Routes } from '@angular/router';

import { adminGuard } from './shared/guards/admin.guard';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'encuesta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/encuesta/encuesta.page').then((module) => module.EncuestaPage),
  },
  {
    path: 'encuesta/confirmar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/encuesta/encuesta-confirmar.page').then(
        (module) => module.EncuestaConfirmarPage,
      ),
  },
  {
    path: 'encuesta/gracias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/encuesta/encuesta-gracias.page').then(
        (module) => module.EncuestaGraciasPage,
      ),
  },
  // Rutas del panel admin: sistema de auth completamente aparte (Bearer
  // token vía AdminAuthService/adminGuard), no comparten nada con el flujo
  // de empleado de arriba.
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login.page').then((module) => module.AdminLoginPage),
  },
  {
    path: 'admin/empleados',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-empleados.page').then((module) => module.AdminEmpleadosPage),
  },
  {
    path: 'admin/respuestas',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-respuestas.page').then((module) => module.AdminRespuestasPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'encuesta',
  },
  {
    path: '**',
    redirectTo: 'encuesta',
  },
];
