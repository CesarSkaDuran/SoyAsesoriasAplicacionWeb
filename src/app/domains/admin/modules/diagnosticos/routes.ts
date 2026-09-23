import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/diagnosticos.page'),
  },
  {
    path: 'config',
    loadComponent: () => import('./features/diagnostico-config.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/diagnostico-detail.page'),
  },
];

export default routes;
