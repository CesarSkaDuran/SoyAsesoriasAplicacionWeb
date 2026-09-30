import { Routes } from '@angular/router';
import { AuthenticationGuard } from '@/app/core/authentication/authentication.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthenticationGuard],
    loadComponent: () => import('./features/terminos.page'),
  },
];

export default routes;
