export interface Empleado {
  id: number;
  empresa_id: number;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  tipo_documento?: string;
  numero_documento?: string;
  direccion?: string;
  movil?: string;
  email?: string;
  fecha_ingreso?: string;
  fecha_retiro?: string | null;
  salario_base?: number;
  subsidio_transporte?: number;
  tipo_contrato?: string;
  periodo_pago?: string;
  riesgo?: string;
  tipo_vinculacion?: string;
  observaciones?: string;
  status?: string;
  sucursal_id?: number | null;
  cargo_id?: number | null;
  eps_id?: number | null;
  arl_id?: number | null;
  pension_id?: number | null;
  caja_cf_id?: number | null;
  ciudad_id?: number | null;
  // joins
  cargo_nombre?: string;
  eps_nombre?: string;
  arl_nombre?: string;
}

export interface Documento {
  id: number;
  empresa_id?: number | null;
  empleado_id?: number | null;
  persona_id?: number | null;
  beneficiado_id?: number | null;
  nomina_id?: number | null;
  servicio_id?: number | null;
  nombre: string;
  descripcion?: string | null;
  path?: string;
  mime?: string;
  size?: number;
  created_at?: string;
}

export interface Nomina {
  id: number;
  empresa_id: number;
  empresa_nombre?: string;
  periodo_id?: number | null;
  nombre_periodo?: string;
  num_empleados?: number;
  salario_dias?: number;
  valor_total?: number;
  total_seguridad_social?: number;
  total_horas_extras?: number;
  total_otros_pagos?: number;
  total_deducciones?: number;
  status?: 'borrador' | 'liquidada' | 'pagada';
  created_at?: string;
}

export interface NominaDetalle {
  id: number;
  nomina_id: number;
  empleado_id: number;
  dias_laborados?: number;
  salario_base?: number;
  aux_transporte?: number;
  horas_extras?: number;
  otros_ingresos?: number;
  ingreso_noc?: number;
  deducciones?: number;
  indemnizacion?: number;
  ibc?: number;
  ibl?: number;
  salud?: number;
  pension?: number;
  arl?: number;
  ccf?: number;
  sena?: number;
  icbf?: number;
  cesantias?: number;
  intereses?: number;
  vacaciones?: number;
  total_nomina?: number;
  total_planilla?: number;
  neto?: number;
  // joins
  primer_nombre?: string;
  primer_apellido?: string;
  numero_documento?: string;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
}

export interface Catalogos {
  [key: string]: CatalogoItem[] | undefined;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// ── Maestros parametrizables (modulo Configuracion) ──────────────────────────
export interface MaestroField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea';
  required?: boolean;
  default?: any;
  /** Para type 'select': catalogo origen (departamentos, empresas, ciudades...) */
  source?: string;
  /** Para type 'select' con opciones fijas */
  options?: { value: any; label: string }[];
}

export interface MaestroMeta {
  key: string;
  label: string;
  singular?: string;
  icon: string;
  fields: MaestroField[];
  total: number;
}
