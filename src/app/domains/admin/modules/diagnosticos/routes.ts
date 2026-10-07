import { Routes } from '@angular/router';
import { ModuloGuard } from '@/app/core/authentication/modulo.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/diagnosticos.page'),
  },
  {
    path: 'config',
    canActivate: [ModuloGuard],
    data: { adminOnly: true },
    loadComponent: () => import('./features/diagnostico-config.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/diagnostico-detail.page'),
  },
];

export default routes;
