import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/nominas.page'),
  },
  {
    path: 'conceptos',
    loadComponent: () => import('./features/conceptos.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/nomina-detail.page'),
  },
  {
    path: ':id/liquidar',
    loadComponent: () => import('./features/nomina-liquidar.page'),
  },
];

export default routes;
