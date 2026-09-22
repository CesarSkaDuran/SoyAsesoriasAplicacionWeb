import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/empleados.page'),
  },
  {
    path: ':id',
    loadComponent: () => import('./features/empleado-detail.page'),
  },
];

export default routes;

