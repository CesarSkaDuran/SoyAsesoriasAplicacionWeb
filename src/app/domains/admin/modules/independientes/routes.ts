import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/independientes.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/independiente-detail.page'),
  },
];

export default routes;
