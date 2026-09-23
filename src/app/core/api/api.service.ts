import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Empresa } from '@/app/models/user.model';
import {
  Catalogos,
  Documento,
  Empleado,
  MaestroMeta,
  Nomina,
  NominaDetalle,
  Paginated,
} from '@/app/models/empleado.model';
import {
  CuentaCobro,
  Diagnostico,
  DiagnosticoDocConfig,
  DiagnosticoDocumento,
  DiagnosticoPregunta,
  Embudo,
  EmbudoResumen,
  EmbudoTablero,
  EmpresaServicio,
  Etapa,
  Gasto,
  Lead,
  LeadHistorial,
  Persona,
  Planilla,
  ServicioCatalogo,
  ServicioRegistro,
  Solicitud,
  Soporte,
  Usuario,
} from '@/app/models/negocio.model';

/**
 * REST client for the soyasesorias-api.
 * All routes are relative — apiPrefixInterceptor prepends environment.serverUrl
 * and jwtInterceptor attaches the Bearer token.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ── Catalogos ──────────────────────────────────────────────────────────────
  catalogos(): Observable<Catalogos> {
    return this.http.get<Catalogos>('/catalogos');
  }

  // ── Usuarios (admin) ────────────────────────────────────────────────────────
  createUser(data: {
    name: string;
    lastname?: string | null;
    email: string;
    password: string;
    role: 'empresa' | 'independiente' | 'admin';
    empresa_id?: number;
    persona_id?: number;
    modulos?: Record<string, boolean>;
  }): Observable<{ user: any }> {
    return this.http.post<{ user: any }>('/auth/users', data);
  }

  // ── Empresas ───────────────────────────────────────────────────────────────
  empresas(
    search?: string,
    page = 1,
    perPage = 20,
    status?: string,
    desde?: string,
    hasta?: string
  ): Observable<Paginated<Empresa>> {
    let params = new HttpParams().set('page', page).set('per_page', perPage);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Paginated<Empresa>>('/empresas', { params });
  }

  empresa(id: number | string): Observable<{ empresa: Empresa } | Empresa> {
    return this.http.get<Empresa>(`/empresas/${id}`);
  }

  createEmpresa(data: Partial<Empresa>): Observable<Empresa> {
    return this.http.post<Empresa>('/empresas', data);
  }

  updateEmpresa(
    id: number | string,
    data: Partial<Empresa>
  ): Observable<Empresa> {
    return this.http.put<Empresa>(`/empresas/${id}`, data);
  }

  // ── Empleados ──────────────────────────────────────────────────────────────
  empleados(
    empresaId?: number | string,
    search?: string,
    page = 1,
    status?: string,
    desde?: string,
    hasta?: string
  ): Observable<Paginated<Empleado>> {
    let params = new HttpParams().set('page', page).set('per_page', 25);
    if (empresaId) params = params.set('empresa_id', empresaId);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Paginated<Empleado>>('/empleados', { params });
  }

  empleado(id: number | string): Observable<{
    empleado: Empleado;
    beneficiarios?: any[];
    documentos?: Documento[];
    incapacidades?: any[];
  }> {
    return this.http.get<any>(`/empleados/${id}`);
  }

  createEmpleado(data: Partial<Empleado>): Observable<Empleado> {
    return this.http.post<Empleado>('/empleados', data);
  }

  updateEmpleado(
    id: number | string,
    data: Partial<Empleado>
  ): Observable<Empleado> {
    return this.http.put<Empleado>(`/empleados/${id}`, data);
  }

  deleteEmpleado(id: number | string): Observable<void> {
    return this.http.delete<void>(`/empleados/${id}`);
  }

  // ── Documentos ─────────────────────────────────────────────────────────────
  // owner: empresa_id | empleado_id | persona_id | beneficiado_id | nomina_id
  documentos(owner: Record<string, number | string>): Observable<{
    data: Documento[];
  }> {
    let params = new HttpParams();
    Object.entries(owner).forEach(([key, value]) => {
      params = params.set(key, value);
    });
    return this.http.get<{ data: Documento[] }>('/documentos', { params });
  }

  uploadDocumento(
    file: File,
    meta: {
      nombre?: string;
      descripcion?: string;
      empresa_id?: number | string;
      empleado_id?: number | string;
      servicio_id?: number | string;
    }
  ): Observable<{ documento: Documento }> {
    const form = new FormData();
    form.append('file', file);
    Object.entries(meta).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    return this.http.post<{ documento: Documento }>('/documentos', form);
  }

  downloadDocumento(id: number | string): Observable<Blob> {
    return this.http.get(`/documentos/${id}/download`, {
      responseType: 'blob',
    });
  }

  deleteDocumento(id: number | string): Observable<void> {
    return this.http.delete<void>(`/documentos/${id}`);
  }

  // ── Nominas ────────────────────────────────────────────────────────────────
  nominas(
    empresaId?: number | string,
    page = 1,
    status?: string
  ): Observable<Paginated<Nomina>> {
    let params = new HttpParams().set('page', page).set('per_page', 25);
    if (empresaId) params = params.set('empresa_id', empresaId);
    if (status) params = params.set('status', status);
    return this.http.get<Paginated<Nomina>>('/nominas', { params });
  }

  nomina(id: number | string): Observable<{
    nomina: Nomina;
    detalles: NominaDetalle[];
  }> {
    return this.http.get<{ nomina: Nomina; detalles: NominaDetalle[] }>(
      `/nominas/${id}`
    );
  }

  // ── Servicios prestados (viejo detalle_servicios) ──────────────────────────
  servicioRegistros(filters: {
    empresa_id?: number | string;
    nombre?: string;
    status?: number | string;
    status_pago?: number | string;
    search?: string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<ServicioRegistro>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<ServicioRegistro>>('/servicio-registros', {
      params,
    });
  }

  createServicioRegistro(
    data: Partial<ServicioRegistro>
  ): Observable<{ registro: ServicioRegistro }> {
    return this.http.post<{ registro: ServicioRegistro }>(
      '/servicio-registros',
      data
    );
  }

  updateServicioRegistro(
    id: number | string,
    data: Partial<ServicioRegistro>
  ): Observable<{ registro: ServicioRegistro }> {
    return this.http.put<{ registro: ServicioRegistro }>(
      `/servicio-registros/${id}`,
      data
    );
  }

  serviciosCatalogo(): Observable<{ data: ServicioCatalogo[] }> {
    return this.http.get<{ data: ServicioCatalogo[] }>('/servicios-catalogo');
  }

  addEmpresaServicio(
    empresaId: number | string,
    data: { servicio_id: number; valor?: number; fecha_inicio?: string }
  ): Observable<{ servicios: EmpresaServicio[] }> {
    return this.http.post<{ servicios: EmpresaServicio[] }>(
      `/empresas/${empresaId}/servicios`,
      data
    );
  }

  removeEmpresaServicio(
    empresaId: number | string,
    servicioId: number | string
  ): Observable<{ servicios: EmpresaServicio[] }> {
    return this.http.delete<{ servicios: EmpresaServicio[] }>(
      `/empresas/${empresaId}/servicios/${servicioId}`
    );
  }

  // ── Pagos (cuentas de cobro) ───────────────────────────────────────────────
  pagos(filters: {
    empresa_id?: number | string;
    status?: number | string;
    search?: string;
    concepto?: string;
    sucursal_id?: number | string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<CuentaCobro>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<CuentaCobro>>('/pagos', { params });
  }

  pago(id: number | string): Observable<{ cuenta: CuentaCobro; detalle: any[] }> {
    return this.http.get<{ cuenta: CuentaCobro; detalle: any[] }>(
      `/pagos/${id}`
    );
  }

  createPago(data: Partial<CuentaCobro>): Observable<{ cuenta: CuentaCobro }> {
    return this.http.post<{ cuenta: CuentaCobro }>('/pagos', data);
  }

  updatePago(
    id: number | string,
    data: Partial<CuentaCobro>
  ): Observable<{ cuenta: CuentaCobro }> {
    return this.http.put<{ cuenta: CuentaCobro }>(`/pagos/${id}`, data);
  }

  // ── Planillas PILA ─────────────────────────────────────────────────────────
  planillas(filters: {
    empresa_id?: number | string;
    periodo?: string;
    status?: string;
    page?: number;
  }): Observable<Paginated<Planilla>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Planilla>>('/planillas', { params });
  }

  createPlanilla(data: Partial<Planilla>): Observable<{ planilla: Planilla }> {
    return this.http.post<{ planilla: Planilla }>('/planillas', data);
  }

  updatePlanilla(
    id: number | string,
    data: Partial<Planilla>
  ): Observable<{ planilla: Planilla }> {
    return this.http.put<{ planilla: Planilla }>(`/planillas/${id}`, data);
  }

  // ── Solicitudes ────────────────────────────────────────────────────────────
  solicitudes(filters: {
    empresa_id?: number | string;
    status?: string;
    search?: string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<Solicitud>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Solicitud>>('/solicitudes', { params });
  }

  createSolicitud(data: {
    servicio_id?: number | null;
    descripcion?: string;
    empresa_id?: number | string;
  }): Observable<{ solicitud: Solicitud }> {
    return this.http.post<{ solicitud: Solicitud }>('/solicitudes', data);
  }

  updateSolicitud(
    id: number | string,
    data: Partial<Solicitud>
  ): Observable<{ solicitud: Solicitud }> {
    return this.http.put<{ solicitud: Solicitud }>(`/solicitudes/${id}`, data);
  }

  // ── Soporte ────────────────────────────────────────────────────────────────
  soportes(filters: {
    status?: number | string;
    search?: string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<Soporte>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Soporte>>('/soportes', { params });
  }

  createSoporte(data: {
    asunto?: string;
    mensaje?: string;
    tipo_solicitud?: string;
    tipo_servicio?: string;
  }): Observable<{ soporte: Soporte }> {
    return this.http.post<{ soporte: Soporte }>('/soportes', data);
  }

  updateSoporte(
    id: number | string,
    data: Partial<Soporte>
  ): Observable<{ soporte: Soporte }> {
    return this.http.put<{ soporte: Soporte }>(`/soportes/${id}`, data);
  }

  // ── Independientes (personas) ──────────────────────────────────────────────
  personas(filters: {
    search?: string;
    status?: string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<Persona>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Persona>>('/personas', { params });
  }

  persona(id: number | string): Observable<{
    persona: Persona;
    documentos: Documento[];
    servicios: ServicioRegistro[];
    cuentas: CuentaCobro[];
  }> {
    return this.http.get<any>(`/personas/${id}`);
  }

  createPersona(data: Partial<Persona>): Observable<{ persona: Persona }> {
    return this.http.post<{ persona: Persona }>('/personas', data);
  }

  updatePersona(
    id: number | string,
    data: Partial<Persona>
  ): Observable<{ persona: Persona }> {
    return this.http.put<{ persona: Persona }>(`/personas/${id}`, data);
  }

  // ── Usuarios (admin) ───────────────────────────────────────────────────────
  usuarios(filters: {
    search?: string;
    role?: string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<Usuario>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Usuario>>('/usuarios', { params });
  }

  updateUsuario(
    id: number | string,
    data: {
      is_active?: boolean;
      name?: string;
      lastname?: string;
      modulos?: Record<string, boolean>;
    }
  ): Observable<{ user: Usuario }> {
    return this.http.put<{ user: Usuario }>(`/usuarios/${id}`, data);
  }

  // ── Gastos (admin) ─────────────────────────────────────────────────────────
  gastos(filters: {
    search?: string;
    status?: number | string;
    sucursal_id?: number | string;
    desde?: string;
    hasta?: string;
    page?: number;
  }): Observable<Paginated<Gasto>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', 25);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, v);
      }
    }
    return this.http.get<Paginated<Gasto>>('/gastos', { params });
  }

  createGasto(data: Partial<Gasto>): Observable<{ gasto: Gasto }> {
    return this.http.post<{ gasto: Gasto }>('/gastos', data);
  }

  updateGasto(
    id: number | string,
    data: Partial<Gasto>
  ): Observable<{ gasto: Gasto }> {
    return this.http.put<{ gasto: Gasto }>(`/gastos/${id}`, data);
  }

  deleteGasto(id: number | string): Observable<void> {
    return this.http.delete<void>(`/gastos/${id}`);
  }

  // ── Nomina: crear cabecera + liquidar ──────────────────────────────────────
  createNomina(data: {
    empresa_id: number | string;
    nombre_periodo?: string;
  }): Observable<{ nomina: Nomina }> {
    return this.http.post<{ nomina: Nomina }>('/nominas', data);
  }

  liquidarNomina(
    id: number | string,
    data: {
      nombre_periodo?: string;
      empleados: {
        empleado_id: number;
        dias_laborados?: number;
        horas_extras?: number;
        otros_ingresos?: number;
        ingreso_noc?: number;
        deducciones?: number;
        indemnizacion?: number;
      }[];
    }
  ): Observable<{ nomina: Nomina; detalles: NominaDetalle[] }> {
    return this.http.put<{ nomina: Nomina; detalles: NominaDetalle[] }>(
      `/nominas/${id}/liquidar`,
      data
    );
  }

  generarPlanilla(
    nominaId: number | string
  ): Observable<{ planilla: Planilla; existente?: boolean }> {
    return this.http.post<{ planilla: Planilla; existente?: boolean }>(
      `/nominas/${nominaId}/planilla`,
      {}
    );
  }

  deleteNomina(id: number | string): Observable<void> {
    return this.http.delete<void>(`/nominas/${id}`);
  }

  // ── Empleado: beneficiarios e incapacidades ────────────────────────────────
  addBeneficiario(
    empleadoId: number | string,
    data: {
      nombre: string;
      parentesco?: string;
      num_documento?: string;
      fecha_nacimiento?: string;
    }
  ): Observable<{ beneficiario: any }> {
    return this.http.post<any>(`/empleados/${empleadoId}/beneficiarios`, data);
  }

  removeBeneficiario(
    empleadoId: number | string,
    beneficiarioId: number | string
  ): Observable<void> {
    return this.http.delete<void>(
      `/empleados/${empleadoId}/beneficiarios/${beneficiarioId}`
    );
  }

  addIncapacidad(
    empleadoId: number | string,
    data: {
      eps_id?: number;
      fecha_inicio: string;
      fecha_fin?: string;
      dias?: number;
      tipo?: string;
      valor?: number;
    }
  ): Observable<{ incapacidad: any }> {
    return this.http.post<any>(`/empleados/${empleadoId}/incapacidades`, data);
  }

  updateIncapacidad(
    empleadoId: number | string,
    incapacidadId: number | string,
    data: Record<string, any>
  ): Observable<{ incapacidad: any }> {
    return this.http.put<any>(
      `/empleados/${empleadoId}/incapacidades/${incapacidadId}`,
      data
    );
  }

  removeIncapacidad(
    empleadoId: number | string,
    incapacidadId: number | string
  ): Observable<void> {
    return this.http.delete<void>(
      `/empleados/${empleadoId}/incapacidades/${incapacidadId}`
    );
  }

  // ── Informes (admin) ───────────────────────────────────────────────────────
  informeResumen(): Observable<{
    empresas: number;
    empleados: number;
    cartera_pendiente: number;
    servicios_pendientes: number;
    tickets_abiertos: number;
  }> {
    return this.http.get<any>('/informes/resumen');
  }

  informeDashboard(): Observable<{
    servicios_por_estado: { estado: string; total: number }[];
    ingresos_mensuales: { mes: string; total: number }[];
    servicios_por_tipo: { nombre: string; total: number }[];
    solicitudes_recientes: any[];
    empresas_recientes: any[];
    independientes: number;
  }> {
    return this.http.get<any>('/informes/dashboard');
  }

  informeIngresos(filters: {
    desde?: string;
    hasta?: string;
    agrupar?: 'dia' | 'cliente' | 'sucursal';
  }): Observable<{ data: any[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v)));
    return this.http.get<{ data: any[] }>('/informes/ingresos', { params });
  }

  informeEgresos(filters: {
    desde?: string;
    hasta?: string;
    agrupar?: 'dia' | 'cliente' | 'sucursal';
  }): Observable<{ data: any[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v)));
    return this.http.get<{ data: any[] }>('/informes/egresos', { params });
  }

  informeServicios(filters: {
    desde?: string;
    hasta?: string;
  }): Observable<{ data: any[] }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v)));
    return this.http.get<{ data: any[] }>('/informes/servicios', { params });
  }

  // ── Maestros / Configuracion (admin) ───────────────────────────────────────
  maestros(): Observable<MaestroMeta[]> {
    return this.http.get<MaestroMeta[]>('/maestros');
  }

  maestroItems(
    catalogo: string,
    filters: { search?: string; page?: number; per_page?: number } = {}
  ): Observable<Paginated<Record<string, any>>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', filters.per_page ?? 25);
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<Paginated<Record<string, any>>>(
      `/maestros/${catalogo}`,
      { params }
    );
  }

  createMaestroItem(
    catalogo: string,
    data: Record<string, any>
  ): Observable<Record<string, any>> {
    return this.http.post<Record<string, any>>(`/maestros/${catalogo}`, data);
  }

  updateMaestroItem(
    catalogo: string,
    id: number | string,
    data: Record<string, any>
  ): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/maestros/${catalogo}/${id}`, data);
  }

  deleteMaestroItem(
    catalogo: string,
    id: number | string
  ): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/maestros/${catalogo}/${id}`);
  }

  // ── Ventas / Comercial (embudos y leads) ────────────────────────────────────
  ventasEmbudos(): Observable<EmbudoResumen[]> {
    return this.http.get<EmbudoResumen[]>('/ventas');
  }

  ventasEmbudo(slug: string | number, search?: string): Observable<EmbudoTablero> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<EmbudoTablero>(`/ventas/embudo/${slug}`, { params });
  }

  ventasLead(id: number): Observable<{ lead: Lead; historial: LeadHistorial[] }> {
    return this.http.get<{ lead: Lead; historial: LeadHistorial[] }>(
      `/ventas/leads/${id}`
    );
  }

  createLead(data: Partial<Lead>): Observable<{ lead: Lead }> {
    return this.http.post<{ lead: Lead }>('/ventas/leads', data);
  }

  updateLead(id: number, data: Partial<Lead>): Observable<{ lead: Lead }> {
    return this.http.put<{ lead: Lead }>(`/ventas/leads/${id}`, data);
  }

  moveLead(
    id: number,
    etapa_id: number,
    orden_pos = 0
  ): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/ventas/leads/${id}/etapa`, {
      etapa_id,
      orden_pos,
    });
  }

  convertirLead(
    id: number,
    tipo: 'empresa' | 'independiente',
    razon_social?: string
  ): Observable<{ lead: Lead; empresa_id?: number; persona_id?: number }> {
    return this.http.post<{ lead: Lead; empresa_id?: number; persona_id?: number }>(
      `/ventas/leads/${id}/convertir`,
      { tipo, razon_social }
    );
  }

  deleteLead(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/ventas/leads/${id}`);
  }

  createEmbudo(data: Partial<Embudo>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/ventas/embudos', data);
  }

  updateEmbudo(id: number, data: Partial<Embudo>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/ventas/embudos/${id}`, data);
  }

  createEtapa(
    embudoId: number,
    data: Partial<Etapa>
  ): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `/ventas/embudos/${embudoId}/etapas`,
      data
    );
  }

  updateEtapa(id: number, data: Partial<Etapa>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/ventas/etapas/${id}`, data);
  }

  deleteEtapa(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/ventas/etapas/${id}`);
  }

  // ── Diagnósticos ────────────────────────────────────────────────────────────
  diagnosticos(filters: {
    empresa_id?: number; responsable_id?: number; estado?: string;
    desde?: string; hasta?: string; search?: string; page?: number;
  } = {}): Observable<Paginated<Diagnostico> & { stats: { total: number; en_progreso: number; logrados: number; por_estado?: { estado: string; total: number }[] } }> {
    let params = new HttpParams().set('page', filters.page ?? 1);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'page') {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<Paginated<Diagnostico> & { stats: { total: number; en_progreso: number; logrados: number; por_estado?: { estado: string; total: number }[] } }>(
      '/diagnosticos', { params }
    );
  }

  diagnostico(id: number): Observable<Diagnostico> {
    return this.http.get<Diagnostico>(`/diagnosticos/${id}`);
  }

  createDiagnostico(data: Partial<Diagnostico>): Observable<Diagnostico> {
    return this.http.post<Diagnostico>('/diagnosticos', data);
  }

  updateDiagnostico(id: number, data: Partial<Diagnostico>): Observable<Diagnostico> {
    return this.http.put<Diagnostico>(`/diagnosticos/${id}`, data);
  }

  updateDiagnosticoEstado(id: number, estado: string): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnosticos/${id}/estado`, { estado });
  }

  deleteDiagnostico(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/diagnosticos/${id}`);
  }

  diagnosticoEntrevista(id: number): Observable<{ preguntas: DiagnosticoPregunta[] }> {
    return this.http.get<{ preguntas: DiagnosticoPregunta[] }>(`/diagnosticos/${id}/entrevista`);
  }

  saveRespuestas(id: number, respuestas: Record<number, unknown>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnosticos/${id}/respuestas`, { respuestas });
  }

  diagnosticoDocumentos(id: number): Observable<{
    documentos: { config: DiagnosticoDocConfig; documento: DiagnosticoDocumento | null }[];
  }> {
    return this.http.get<{
      documentos: { config: DiagnosticoDocConfig; documento: DiagnosticoDocumento | null }[];
    }>(`/diagnosticos/${id}/documentos`);
  }

  uploadDiagnosticoDoc(id: number, configId: number, file: File, comentarios?: string): Observable<{ ok: boolean }> {
    const form = new FormData();
    form.append('archivo', file);
    if (comentarios) form.append('comentarios', comentarios);
    return this.http.post<{ ok: boolean }>(`/diagnosticos/${id}/documentos/${configId}`, form);
  }

  revisarDiagnosticoDoc(docId: number, estado: string, comentarios?: string): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnosticos/documentos/${docId}`, { estado, comentarios });
  }

  diagnosticoDocDownloadUrl(docId: number): string {
    return `/api/diagnosticos/documentos/${docId}/download`;
  }

  diagnosticoInforme(id: number): Observable<{ contenido_html: string }> {
    return this.http.get<{ contenido_html: string }>(`/diagnosticos/${id}/informe`);
  }

  saveDiagnosticoInforme(id: number, contenido_html: string): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnosticos/${id}/informe`, { contenido_html });
  }

  // Configuración de diagnósticos (admin)
  diagPreguntas(): Observable<{ data: DiagnosticoPregunta[] }> {
    return this.http.get<{ data: DiagnosticoPregunta[] }>('/diagnostico-config/preguntas');
  }

  createDiagPregunta(data: Partial<DiagnosticoPregunta>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/diagnostico-config/preguntas', data);
  }

  updateDiagPregunta(id: number, data: Partial<DiagnosticoPregunta>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnostico-config/preguntas/${id}`, data);
  }

  deleteDiagPregunta(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/diagnostico-config/preguntas/${id}`);
  }

  diagDocConfigs(): Observable<{ data: DiagnosticoDocConfig[] }> {
    return this.http.get<{ data: DiagnosticoDocConfig[] }>('/diagnostico-config/documentos');
  }

  createDiagDocConfig(data: Partial<DiagnosticoDocConfig>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/diagnostico-config/documentos', data);
  }

  updateDiagDocConfig(id: number, data: Partial<DiagnosticoDocConfig>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/diagnostico-config/documentos/${id}`, data);
  }

  deleteDiagDocConfig(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/diagnostico-config/documentos/${id}`);
  }
}
