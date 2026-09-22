/**
 * Modelos de los módulos de operación: servicios prestados, pagos
 * (cuentas de cobro), planillas, solicitudes, soporte, independientes,
 * usuarios y gastos. Los códigos numéricos de estado son los mismos que
 * usaba el sistema viejo para conservar la data migrada.
 */

// ── Servicios prestados (viejo detalle_servicios) ─────────────────────────────
// status: 1=Pendiente 2=Finalizado 3=Verificado 4=En trámite 5=Cancelado
// status_pago: 1=Pagado 2=Pendiente 3=Cancelado
export interface ServicioRegistro {
  id: number;
  empresa_id: number | null;
  persona_id: number | null;
  empleado_id: number | null;
  servicio_id: number | null;
  nombre: string | null;
  tipo: number | null;
  fecha: string | null;
  cantidad: number;
  valor: number | string | null;
  paquete: string | null;
  unidad: string | null;
  numero_empleados: number;
  obs: string | null;
  status: number;
  status_pago: number;
  sucursal_id?: number | null;
  empresa_nombre?: string;
  empresa_nit?: string;
  empresa_dv?: string;
  persona_nombre?: string;
  empleado_nombre?: string;
  sucursal_nombre?: string;
  tipo_cliente?: 'Empresa' | 'Independiente';
  cliente_nombre?: string;
  cliente_nit?: string;
  representante?: string;
  telefono?: string;
}

export const SERVICIO_STATUS: Record<number, string> = {
  1: 'Pendiente',
  2: 'Finalizado',
  3: 'Verificado',
  4: 'En trámite',
  5: 'Cancelado',
};

export const SERVICIO_STATUS_COLOR: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-green-500',
  3: 'bg-blue-500',
  4: 'bg-indigo-500',
  5: 'bg-amber-500',
};

export const PAGO_STATUS: Record<number, string> = {
  1: 'Pagado',
  2: 'Pendiente',
  3: 'Cancelado',
};

export const PAGO_STATUS_COLOR: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-red-500',
  3: 'bg-neutral-400',
};

// Categorías del submenú Servicios (valores de detalle_servicios.nombre)
export const SERVICIO_CATEGORIAS = [
  { key: 'afiliaciones', label: 'Afiliaciones', nombre: 'AFILIACIONES PARA SEGURIDAD SOCIAL' },
  { key: 'asesorias', label: 'Asesorías', nombre: 'ASESORIAS' },
  { key: 'contratos', label: 'Contratos', nombre: 'CONTRATOS' },
  { key: 'examenes', label: 'Exámenes', nombre: 'EXAMENES OCUPACIONALES' },
  { key: 'incapacidades', label: 'Incapacidades', nombre: 'INCAPACIDADES' },
  { key: 'planillas', label: 'Liquidación Planillas', nombre: 'LIQUIDACION Y PAGOS DE PLANILLAS' },
] as const;

// ── Pagos / cuentas de cobro ──────────────────────────────────────────────────
// status: 1=Pagado 2=Pendiente 3=En trámite 4=Activo 5=Rechazado
export interface CuentaCobro {
  id: number;
  empresa_id: number | null;
  persona_id: number | null;
  tercero_id?: number | null;
  sucursal_id?: number | null;
  numero: string | null;
  nombre: string | null;
  tipo?: number | null;
  banco?: string | null;
  meses?: string | null;
  fecha: string | null;
  valor_total: number | string;
  iva: number | string;
  cuatroxmil: number | string;
  obs: string | null;
  status: number;
  created_at?: string;
  updated_at?: string;
  empresa_nombre?: string;
  persona_nombre?: string;
  tercero_nombre?: string;
  sucursal_nombre?: string;
  cliente_nombre?: string;
  cliente_nit?: string;
}

export const CUENTA_STATUS: Record<number, string> = {
  1: 'Pagado',
  2: 'Pendiente',
  3: 'En trámite',
  4: 'Activo',
  5: 'Rechazado',
};

export const CUENTA_STATUS_COLOR: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-red-500',
  3: 'bg-blue-500',
  4: 'bg-indigo-500',
  5: 'bg-amber-500',
};

// ── Planillas PILA ────────────────────────────────────────────────────────────
export interface Planilla {
  id: number;
  empresa_id: number;
  nomina_id: number | null;
  numero_planilla: string | null;
  periodo: string | null;
  valor_total: number | string;
  fecha_pago: string | null;
  status: 'generada' | 'pagada' | 'verificada';
  empresa_nombre?: string;
  nombre_periodo?: string;
  num_empleados?: number;
  salario_dias?: number;
  total_otros_pagos?: number;
}

// ── Solicitudes ───────────────────────────────────────────────────────────────
export interface Solicitud {
  id: number;
  empresa_id: number | null;
  persona_id: number | null;
  servicio_id: number | null;
  descripcion: string | null;
  status: 'pendiente' | 'en_proceso' | 'completada' | 'rechazada';
  created_at: string;
  empresa_nombre?: string;
  persona_nombre?: string;
  servicio_nombre?: string;
  cliente_nombre?: string;
  cliente_nit?: string;
  telefono?: string;
}

// ── Soporte ───────────────────────────────────────────────────────────────────
// status numérico del sistema viejo: 1=Pendiente 2=En proceso 3=Resuelto
// 4=Cerrado 5=Rechazado
export interface Soporte {
  id: number;
  user_id: number | null;
  asunto: string;
  mensaje: string | null;
  tipo_solicitud: string | null;
  tipo_servicio: string | null;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  status: number;
  created_at: string;
  user_name?: string;
  user_lastname?: string;
  empresa_nombre?: string;
}

export const SOPORTE_STATUS: Record<number, string> = {
  1: 'Pendiente',
  2: 'En proceso',
  3: 'Resuelto',
  4: 'Cerrado',
  5: 'Rechazado',
};

export const SOPORTE_TIPOS = [
  'AFILIACION A SEGURIDAD SOCIAL',
  'ASESORIA',
  'CONTRATACION LABORAL',
  'PLANILLAS Y LIQUIDACION DE APORTES',
  'OTROS SERVICIO',
];

// ── Independientes (personas) ─────────────────────────────────────────────────
export interface Persona {
  id: number;
  user_id: number | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  tipo_documento: string;
  num_documento: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  status: string;
  created_at?: string;
  departamento_nombre?: string;
  ciudad_nombre?: string;
  departamento_id?: number | null;
  ciudad_id?: number | null;
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
export interface Usuario {
  id: number;
  name: string;
  lastname: string | null;
  email: string;
  role: 'admin' | 'empresa' | 'independiente';
  is_active: number;
  created_at: string;
  empresa_id?: number | null;
  empresa_nombre?: string;
  persona_id?: number | null;
  persona_nombre?: string;
}

// ── Gastos ────────────────────────────────────────────────────────────────────
export interface Gasto {
  id: number;
  lista_gasto_id: number | null;
  empresa_id: number | null;
  tercero_id?: number | null;
  sucursal_id?: number | null;
  nombre?: string | null;
  descripcion: string | null;
  banco?: string | null;
  meses?: string | null;
  valor: number | string;
  iva?: number | string;
  status?: number;
  fecha: string | null;
  tipo_nombre?: string;
  empresa_nombre?: string;
  tercero_nombre?: string;
  sucursal_nombre?: string;
  proveedor_nombre?: string;
  proveedor_nit?: string;
}

export interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'servicio' | 'plan';
  valor: number | string | null;
}

export interface EmpresaServicio {
  id: number;
  empresa_id: number;
  servicio_id: number;
  servicio_nombre?: string;
  tipo?: string;
  valor: number | string | null;
  fecha_inicio?: string | null;
  status: string;
}
