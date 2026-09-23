import { Routes } from '@angular/router';
import { AuthenticationGuard } from '@/app/core/authentication/authentication.guard';
import { ModuloGuard } from '@/app/core/authentication/modulo.guard';
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
        canActivate: [ModuloGuard],
        data: { modulo: 'empleados' },
        loadChildren: () => import('./modules/empleados/routes'),
      },
      {
        path: 'documentos',
        canActivate: [ModuloGuard],
        data: { modulo: 'documentos' },
        loadChildren: () => import('./modules/documentos/routes'),
      },
      {
        path: 'nominas',
        canActivate: [ModuloGuard],
        data: { modulo: 'nominas' },
        loadChildren: () => import('./modules/nominas/routes'),
      },
      {
        path: 'independientes',
        canActivate: [ModuloGuard],
        data: { modulo: 'independientes' },
        loadChildren: () => import('./modules/independientes/routes'),
      },
      {
        path: 'servicios',
        canActivate: [ModuloGuard],
        data: { modulo: 'servicios' },
        loadChildren: () => import('./modules/servicios/routes'),
      },
      {
        path: 'planillas',
        canActivate: [ModuloGuard],
        data: { modulo: 'planillas' },
        loadChildren: () => import('./modules/planillas/routes'),
      },
      {
        path: 'pagos',
        canActivate: [ModuloGuard],
        data: { modulo: 'pagos' },
        loadChildren: () => import('./modules/pagos/routes'),
      },
      {
        path: 'ventas',
        canActivate: [ModuloGuard],
        data: { adminOnly: true },
        loadChildren: () => import('./modules/ventas/routes'),
      },
      {
        path: 'diagnosticos',
        canActivate: [ModuloGuard],
        data: { modulo: 'diagnosticos' },
        loadChildren: () => import('./modules/diagnosticos/routes'),
      },
      {
        path: 'solicitudes',
        canActivate: [ModuloGuard],
        data: { modulo: 'solicitudes' },
        loadChildren: () => import('./modules/solicitudes/routes'),
      },
      {
        path: 'soporte',
        canActivate: [ModuloGuard],
        data: { modulo: 'soportes' },
        loadChildren: () => import('./modules/soporte/routes'),
      },
      {
        path: 'usuarios',
        canActivate: [ModuloGuard],
        data: { adminOnly: true },
        loadChildren: () => import('./modules/usuarios/routes'),
      },
      {
        path: 'gastos',
        canActivate: [ModuloGuard],
        data: { adminOnly: true },
        loadChildren: () => import('./modules/gastos/routes'),
      },
      {
        path: 'informes',
        canActivate: [ModuloGuard],
        data: { adminOnly: true },
        loadChildren: () => import('./modules/informes/routes'),
      },
      {
        path: 'configuracion',
        canActivate: [ModuloGuard],
        data: { adminOnly: true },
        loadChildren: () => import('./modules/configuracion/routes'),
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
