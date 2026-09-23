import { Routes } from '@angular/router';
import { ModuloGuard } from '@/app/core/authentication/modulo.guard';

const routes: Routes = [
  {
    path: 'mi-empresa',
    loadComponent: () => import('./features/mi-empresa.redirect'),
  },
  {
    path: '',
    canActivate: [ModuloGuard],
    data: { adminOnly: true },
    loadComponent: () => import('./features/empresas.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/empresa-detail.page'),
  },
];

export default routes;
