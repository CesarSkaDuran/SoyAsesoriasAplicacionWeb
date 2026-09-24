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
  auxilio_transporte_mode?: 'automatico' | 'si' | 'no';
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
  // Datos PILA (Res. 2388/2016) — solo alimentan el archivo plano
  tipo_cotizante?: string | null;
  subtipo_cotizante?: string | null;
  tipo_trabajador?: string | null;
  subtipo_trabajador?: string | null;
  salario_integral?: boolean | number;
  extranjero_sin_pension?: boolean | number;
  colombiano_exterior?: boolean | number;
  // CST art. 192: si el salario es variable, las vacaciones se liquidan
  // con el promedio del devengado del último año
  salario_variable?: boolean | number;
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
  tipo_id?: number | null;
  tipo_nombre?: string | null;
  cliente_nombre?: string | null;
  version?: string | null;
  fecha_emision?: string | null;
  estatus?: 'recibido' | 'en_revision' | 'rechazado';
  nombre: string;
  descripcion?: string | null;
  path?: string;
  mime?: string;
  size?: number;
  created_at?: string;
}

export interface DocumentoTipo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  orden?: number;
  activo?: boolean;
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
  total_aportes_empleador?: number;
  total_prestaciones?: number;
  total_costo_empresa?: number;
  vigencia?: number;
  dias_periodo?: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  aplica_exoneracion?: boolean | number;
  parametros_snapshot?: string | Record<string, unknown> | null;
  total_horas_extras?: number;
  total_otros_pagos?: number;
  total_deducciones?: number;
  total_neto_pagar?: number;
  status?: 'borrador' | 'liquidada' | 'pagada';
  created_at?: string;
}

export interface NominaParametros {
  vigencia: number;
  salario_minimo: number;
  auxilio_transporte: number;
  auxilio_tope_smmlv: number;
  max_ibc_smmlv: number;
  uvt: number;
  salud_empleado_pct: number;
  pension_empleado_pct: number;
  salud_empleador_pct: number;
  pension_empleador_pct: number;
  arl_i_pct: number;
  arl_ii_pct: number;
  arl_iii_pct: number;
  arl_iv_pct: number;
  arl_v_pct: number;
  caja_pct: number;
  sena_pct: number;
  icbf_pct: number;
  prima_pct: number;
  cesantias_pct: number;
  intereses_cesantias_pct_anual: number;
  vacaciones_pct: number;
  fsp_tope_inicial_smmlv: number;
  fsp_4_16_pct: number;
  fsp_16_17_pct: number;
  fsp_17_18_pct: number;
  fsp_18_19_pct: number;
  fsp_19_20_pct: number;
  fsp_mas_20_pct: number;
  limite_no_salarial_pct: number;
  retencion_tabla?: RetencionTramo[] | string | null;
  retencion_exenta_pct?: number;
  retencion_exenta_tope_uvt?: number;
  extra_diurna_pct?: number;
  extra_nocturna_pct?: number;
  recargo_nocturno_pct?: number;
  dominical_cortes?: CorteFecha[] | string | null;
  jornada_cortes?: CorteFecha[] | string | null;
  extras_max_diarias?: number;
  extras_max_semanales?: number;
  incapacidad_comun_dias_empleador?: number;
  incapacidad_comun_eps_pct?: number;
  incapacidad_excedente_pct?: number;
  incapacidad_laboral_dias_empleador?: number;
  incapacidad_laboral_pct?: number;
  licencia_maternidad_dias?: number;
  licencia_paternidad_dias?: number;
  fuente_normativa?: string | null;
}

export interface RetencionTramo {
  desde: number;
  hasta: number | null;
  tarifa: number;
  resta_uvt?: number;
  suma_uvt?: number;
}

export interface CorteFecha {
  desde: string;
  horas_semanales?: number;
  pct?: number;
}

export interface HoraExtraInput {
  tipo: string;
  cantidad: number;
  fecha?: string;
}

export interface ConceptoNomina {
  id: number;
  nombre: string;
  constitutivo_salario: boolean | number;
  tratamiento_fiscal: 'gravable' | 'incr';
  limite_incr_uvt?: number | null;
  condicion_salario_uvt?: number | null;
  activo_pendiente_verificacion?: boolean | number;
  fuente_normativa?: string | null;
  activo?: boolean | number;
}

export interface IngresoConceptoInput {
  concepto_id: number;
  valor: number;
}

export interface Incapacidad {
  id: number;
  empleado_id: number;
  eps_id?: number | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  dias?: number | null;
  tipo?: 'comun' | 'laboral' | 'maternidad' | 'paternidad' | 'no_remunerada' | 'vacaciones' | 'otra';
  valor?: number | null;
  status?: string;
  primer_nombre?: string;
  primer_apellido?: string;
  numero_documento?: string;
}

export interface PilaCobertura {
  total: number;
  con_codigo: number;
}

export interface PilaEstado {
  catalogos: Record<string, PilaCobertura>;
  aportantes: { sin_arl: number; sin_eps: number };
  cotizantes: { sin_tipo_cotizante: number; sin_tipo_trabajador: number };
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
  ingreso_noc_incr?: boolean | number;
  ingreso_noc_incr_motivo?: string | null;
  ingresos_detalle?: string | {
    concepto_id?: number | null;
    concepto?: string | null;
    valor: number;
    constitutivo_salario?: boolean;
    tratamiento_fiscal?: string;
  }[] | null;
  deducciones?: number;
  deduccion_salud?: number;
  deduccion_pension?: number;
  salud_empleado?: number;
  pension_empleado?: number;
  fsp?: number;
  prima?: number;
  retencion_fuente?: number;
  retencion_calculada?: number;
  retencion_ajuste?: number;
  retencion_ajuste_motivo?: string | null;
  dias_incapacidad?: number;
  valor_incapacidad_empleador?: number;
  valor_incapacidad_tercero?: number;
  recargos_detalle?: string | { tipo: string; cantidad: number; fecha?: string; valor: number }[] | null;
  deducciones_detalle?: string | { tipo: string; concepto: string; valor: number }[] | null;
  valor_vacaciones?: number;
  novedades_detalle?: string | unknown[] | null;
  alertas?: string | string[] | null;
  total_devengado?: number;
  total_deducciones?: number;
  total_aportes_empleador?: number;
  total_prestaciones?: number;
  neto_pagar?: number;
  costo_empresa?: number;
  no_salarial_ibc?: number;
  exonerado_ley_114_1?: boolean | number;
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
