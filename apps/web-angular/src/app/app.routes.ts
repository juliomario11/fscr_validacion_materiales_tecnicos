import { Routes } from '@angular/router';

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
