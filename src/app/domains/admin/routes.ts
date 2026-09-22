import { Routes } from '@angular/router';
import { AuthenticationGuard } from '@/app/core/authentication/authentication.guard';
import { AdminLayout } from './layout/layout';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    canActivate: [AuthenticationGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },

      {
        path: 'home',
        loadChildren: () => import('./modules/home/routes'),
      },
      {
        path: 'empresas',
        loadChildren: () => import('./modules/empresas/routes'),
      },
      {
        path: 'empleados',
        loadChildren: () => import('./modules/empleados/routes'),
      },
      {
        path: 'documentos',
        loadChildren: () => import('./modules/documentos/routes'),
      },
      {
        path: 'nominas',
        loadChildren: () => import('./modules/nominas/routes'),
      },
      {
        path: 'independientes',
        loadChildren: () => import('./modules/independientes/routes'),
      },
      {
        path: 'servicios',
        loadChildren: () => import('./modules/servicios/routes'),
      },
      {
        path: 'planillas',
        loadChildren: () => import('./modules/planillas/routes'),
      },
      {
        path: 'pagos',
        loadChildren: () => import('./modules/pagos/routes'),
      },
      {
        path: 'solicitudes',
        loadChildren: () => import('./modules/solicitudes/routes'),
      },
      {
        path: 'soporte',
        loadChildren: () => import('./modules/soporte/routes'),
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/routes'),
      },
      {
        path: 'gastos',
        loadChildren: () => import('./modules/gastos/routes'),
      },
      {
        path: 'informes',
        loadChildren: () => import('./modules/informes/routes'),
      },

      // 404
      {
        path: '404',
        pathMatch: 'full',
        loadComponent: () =>
          import('./modules/extras/error/features/error-404'),
      },

      // Catch all
      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
