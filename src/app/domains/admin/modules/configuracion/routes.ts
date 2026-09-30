import { Routes } from '@angular/router';
import { ModuloGuard } from '@/app/core/authentication/modulo.guard';

const routes: Routes = [
  {
    path: 'auditorias',
    canActivate: [ModuloGuard],
    data: { adminOnly: true },
    loadComponent: () => import('./features/auditorias.page'),
  },
  {
    path: 'correo',
    canActivate: [ModuloGuard],
    data: { adminOnly: true },
    loadComponent: () => import('./features/correo.page'),
  },
  {
    path: '',
    loadComponent: () => import('./features/configuracion.page'),
  },
];

export default routes;
