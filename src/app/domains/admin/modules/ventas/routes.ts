import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/ventas.page'),
  },
  {
    path: 'embudo/:slug',
    loadComponent: () => import('./features/embudo.page'),
  },
];

export default routes;
