import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/solicitudes.page'),
  },
];

export default routes;
