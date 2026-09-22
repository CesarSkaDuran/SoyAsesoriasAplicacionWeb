import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'mi-empresa',
    loadComponent: () => import('./features/mi-empresa.redirect'),
  },
  {
    path: '',
    loadComponent: () => import('./features/empresas.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/empresa-detail.page'),
  },
];

export default routes;
