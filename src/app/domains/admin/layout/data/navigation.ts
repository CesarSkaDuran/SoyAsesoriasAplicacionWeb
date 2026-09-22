import { IsActiveMatchOptions } from '@angular/router';

export type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  route?: string;
  icon?: string;
  badge?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  expanded?: boolean;
  activeOptions?: { exact: boolean } | IsActiveMatchOptions;
  /** Solo admin lo ve (si no se define, aplica `modulo` o es público) */
  adminOnly?: boolean;
  /** Solo usuarios con empresa (rol empresa) lo ven */
  empresaOnly?: boolean;
  /** Clave de user_modulos requerida para usuarios no-admin */
  modulo?: string;
};

export const NAVIGATION: NavigationItem[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Panel principal',
    children: [
      {
        id: 'general/home',
        label: 'Inicio',
        icon: 'house',
        route: '/admin/home',
        modulo: 'home',
      },
    ],
  },
  {
    id: 'gestion',
    label: 'Gestión',
    description: 'Información de clientes',
    children: [
      {
        id: 'gestion/empresas',
        label: 'Empresas',
        icon: 'building',
        route: '/admin/empresas',
        modulo: 'empresas',
        adminOnly: true,
      },
      {
        id: 'gestion/mi-empresa',
        label: 'Mi empresa',
        icon: 'building',
        route: '/admin/empresas/mi-empresa',
        empresaOnly: true,
      },
      {
        id: 'gestion/independientes',
        label: 'Independientes',
        icon: 'user-round',
        route: '/admin/independientes',
        modulo: 'independientes',
      },
      {
        id: 'gestion/empleados',
        label: 'Empleados',
        icon: 'users',
        route: '/admin/empleados',
        modulo: 'empleados',
      },
    ],
  },
  {
    id: 'nomina',
    label: 'Nómina y seguridad social',
    children: [
      {
        id: 'nomina/nominas',
        label: 'Nóminas',
        icon: 'banknote',
        route: '/admin/nominas',
        modulo: 'nominas',
      },
      {
        id: 'nomina/planillas',
        label: 'Planillas',
        icon: 'file-check',
        route: '/admin/planillas',
        modulo: 'planillas',
      },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios',
    children: [
      {
        id: 'servicios/root',
        label: 'Servicios',
        icon: 'handshake',
        modulo: 'servicios',
        children: [
          {
            id: 'servicios/afiliaciones',
            label: 'Afiliaciones',
            icon: 'shield-check',
            route: '/admin/servicios/afiliaciones',
            modulo: 'servicios',
          },
          {
            id: 'servicios/asesorias',
            label: 'Asesorías',
            icon: 'messages-square',
            route: '/admin/servicios/asesorias',
            modulo: 'servicios',
          },
          {
            id: 'servicios/contratos',
            label: 'Contratos',
            icon: 'scroll-text',
            route: '/admin/servicios/contratos',
            modulo: 'servicios',
          },
          {
            id: 'servicios/examenes',
            label: 'Exámenes',
            icon: 'stethoscope',
            route: '/admin/servicios/examenes',
            modulo: 'servicios',
          },
          {
            id: 'servicios/incapacidades',
            label: 'Incapacidades',
            icon: 'heart-pulse',
            route: '/admin/servicios/incapacidades',
            modulo: 'servicios',
          },
          {
            id: 'servicios/planillas',
            label: 'Liquidación Planillas',
            icon: 'clipboard-list',
            route: '/admin/servicios/planillas',
            modulo: 'servicios',
          },
        ],
      },
      {
        id: 'servicios/documentos',
        label: 'Documentos',
        icon: 'folder-tree',
        route: '/admin/documentos',
        modulo: 'documentos',
      },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    children: [
      {
        id: 'finanzas/pagos',
        label: 'Pagos',
        icon: 'circle-dollar-sign',
        route: '/admin/pagos',
        modulo: 'pagos',
      },
      {
        id: 'finanzas/gastos',
        label: 'Gastos',
        icon: 'receipt',
        route: '/admin/gastos',
        modulo: 'gastos',
      },
      {
        id: 'finanzas/informes',
        label: 'Informes',
        icon: 'chart-column',
        route: '/admin/informes',
        adminOnly: true,
      },
    ],
  },
  {
    id: 'operacion',
    label: 'Operación',
    children: [
      {
        id: 'operacion/solicitudes',
        label: 'Solicitudes',
        icon: 'inbox',
        route: '/admin/solicitudes',
        modulo: 'solicitudes',
      },
      {
        id: 'operacion/soporte',
        label: 'Soporte',
        icon: 'life-buoy',
        route: '/admin/soporte',
        modulo: 'soportes',
      },
      {
        id: 'operacion/usuarios',
        label: 'Usuarios',
        icon: 'user-cog',
        route: '/admin/usuarios',
        adminOnly: true,
      },
    ],
  },
];
