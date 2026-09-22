export type UserRole = 'admin' | 'empresa' | 'independiente';

export interface UserModulos {
  home?: boolean;
  empresas?: boolean;
  empleados?: boolean;
  documentos?: boolean;
  nominas?: boolean;
  planillas?: boolean;
  servicios?: boolean;
  pagos?: boolean;
  independientes?: boolean;
  usuarios?: boolean;
  informes?: boolean;
  soporte?: boolean;
}

export interface Empresa {
  id: number;
  user_id?: number | null;
  razon_social: string;
  tipo_documento?: string;
  num_documento?: string;
  dv?: string;
  tipo_empresa?: string;
  direccion?: string;
  telefono_fijo?: string;
  telefono_movil?: string;
  email?: string;
  email_contacto?: string;
  representante_legal?: string;
  nombre_contacto?: string;
  telefono_contacto?: string;
  email_responsable?: string;
  telefono_responsable?: string;
  imagen?: string | null;
  num_empleados?: number;
  riesgo?: string;
  valor_empleado?: number;
  fecha_registro?: string;
  status?: string;
  observaciones?: string;
  ciudad_id?: number | null;
  departamento_id?: number | null;
  caja_compensacion_id?: number | null;
  actividad_economica_id?: number | null;
  exonerado_parafiscales?: string;
}

export interface Persona {
  id: number;
  user_id?: number | null;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  tipo_documento?: string;
  num_documento?: string;
  email?: string;
  telefono?: string;
  tipo_afiliacion?: string;
}

export interface User {
  id: number;
  name: string;
  lastname?: string | null;
  email: string;
  role: UserRole;
  is_active?: boolean;
  empresa?: Empresa | null;
  persona?: Persona | null;
  modulos?: UserModulos;
}

export function userFullName(user: User | null | undefined): string {
  if (!user) return '';
  return `${user.name ?? ''} ${user.lastname ?? ''}`.trim();
}
