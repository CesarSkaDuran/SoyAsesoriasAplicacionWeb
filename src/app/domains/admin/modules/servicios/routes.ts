import { Routes } from '@angular/router';

// Mismo componente para todas las categorías; el filtro llega por route data
// (igual que el portal viejo: cada página era la misma lista con otro search2).
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'afiliaciones' },
  {
    path: 'afiliaciones',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'AFILIACIONES PARA SEGURIDAD SOCIAL', titulo: 'Servicio Afiliaciones' },
  },
  {
    path: 'asesorias',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'ASESORIAS', titulo: 'Servicio Asesorías' },
  },
  {
    path: 'contratos',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'CONTRATOS', titulo: 'Servicio Contratos' },
  },
  {
    path: 'examenes',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'EXAMENES OCUPACIONALES', titulo: 'Servicio Exámenes' },
  },
  {
    path: 'incapacidades',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'INCAPACIDADES', titulo: 'Servicio Incapacidades' },
  },
  {
    path: 'planillas',
    loadComponent: () => import('./features/servicios.page'),
    data: { categoria: 'LIQUIDACION Y PAGOS DE PLANILLAS', titulo: 'Servicio Planillas' },
  },
];

export default routes;
