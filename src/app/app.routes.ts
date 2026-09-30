import { Route } from '@angular/router';

export const routes: Route[] = [
  // Auth
  {
    path: 'auth',
    loadChildren: () => import('./domains/auth/routes'),
  },

  // Aceptación de términos (pantalla bloqueante post-login)
  {
    path: 'terminos',
    loadChildren: () => import('./domains/terminos/routes'),
  },

  // Admin
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin',
  },
  {
    path: 'admin',
    loadChildren: () => import('./domains/admin/routes'),
  },
];
