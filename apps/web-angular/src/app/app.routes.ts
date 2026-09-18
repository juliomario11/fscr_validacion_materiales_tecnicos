import { Routes } from '@angular/router';

import { adminGuard } from './shared/guards/admin.guard';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'inventario',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventario/inventario.page').then((module) => module.InventarioPage),
  },
  {
    path: 'inventario/confirmar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventario/inventario-confirmar.page').then(
        (module) => module.InventarioConfirmarPage,
      ),
  },
  {
    path: 'inventario/gracias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventario/inventario-gracias.page').then(
        (module) => module.InventarioGraciasPage,
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
    redirectTo: 'inventario',
  },
  {
    path: '**',
    redirectTo: 'inventario',
  },
];
