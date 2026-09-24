import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Nomina, NominaDetalle, PilaEstado } from '@/app/models/empleado.model';

@Component({
  selector: 'nomina-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTableModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './nomina-detail.page.html',
})
export default class NominaDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  protected creds = inject(CredentialsService);

  protected nomina = signal<Nomina | null>(null);
  protected detalles = signal<NominaDetalle[]>([]);
  protected pilaEstado = signal<PilaEstado | null>(null);

  protected pilaResumen(): string[] {
    const e = this.pilaEstado();
    if (!e) return [];
    const etiquetas: Record<string, string> = {
      eps: 'EPS', arl: 'ARL', pensiones: 'Fondos de pensión',
      cajas_compensacion: 'Cajas de compensación', departamentos: 'Departamentos (DANE)',
      ciudades: 'Ciudades (DANE)', cargos: 'Cargos (CIUO)', sucursales: 'Sucursales',
    };
    return Object.entries(e.catalogos).map(
      ([k, v]) => `${etiquetas[k] ?? k}: ${v.con_codigo}/${v.total} con código`
    );
  }

  protected pilaCompleta(): boolean {
    const e = this.pilaEstado();
    if (!e) return false;
    const catalogosOk = Object.values(e.catalogos).every((v) => v.total > 0 && v.con_codigo === v.total);
    return catalogosOk
      && !e.aportantes.sin_arl && !e.aportantes.sin_eps
      && !e.cotizantes.sin_tipo_cotizante && !e.cotizantes.sin_tipo_trabajador;
  }
  protected printSlip = signal<NominaDetalle | null>(null);
  protected loading = signal(true);
  protected generando = signal(false);
  protected columns = [
    'empleado', 'dias', 'salario', 'auxilio', 'extras', 'incapacidad', 'otros',
    'salud_empleado', 'pension_empleado', 'fsp', 'retencion', 'deducciones', 'neto',
    'prima', 'cesantias', 'intereses', 'vacaciones', 'costo_empresa', 'desprendible',
  ];
  protected columnsPlanilla = [
    'p_empleado', 'p_ibc', 'p_salud_trab', 'p_salud_emp',
    'p_pension_trab', 'p_pension_emp', 'p_fsp', 'p_arl',
    'p_ccf', 'p_sena', 'p_icbf', 'p_total',
  ];

  isAdmin = () => this.creds.isAdmin();

  generarPlanilla() {
    const n = this.nomina();
    if (!n) return;
    this.generando.set(true);
    this.api.generarPlanilla(n.id).subscribe({
      next: (res) => {
        this.generando.set(false);
        this.snack.open(
          res.existente
            ? 'Ya existe una planilla para esta nómina'
            : `Planilla #${res.planilla.id} generada`,
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/admin/planillas']);
      },
      error: () => {
        this.generando.set(false);
        this.snack.open('No se pudo generar la planilla', 'Cerrar');
      },
    });
  }

  exportarCsv() {
    const n = this.nomina();
    if (!n) return;
    const header = [
      'Empleado',
      'Documento',
      'Dias',
      'Dias incapacidad',
      'Incapacidad empleador',
      'Incapacidad tercero',
      'Retencion calculada',
      'Retencion ajuste',
      'IBC',
      'Salud trabajador',
      'Salud empleador',
      'Pension trabajador',
      'Pension empleador',
      'FSP trabajador',
      'ARL',
      'CCF',
      'SENA',
      'ICBF',
      'Total planilla',
    ];
    const filas = this.detalles().map((d) => [
      `"${d.primer_nombre ?? ''} ${d.primer_apellido ?? ''}"`,
      d.numero_documento ?? '',
      d.dias_laborados ?? 0,
      d.dias_incapacidad ?? 0,
      d.valor_incapacidad_empleador ?? 0,
      d.valor_incapacidad_tercero ?? 0,
      d.retencion_calculada ?? 0,
      d.retencion_ajuste ?? 0,
      d.ibc ?? 0,
      d.salud_empleado ?? 0,
      d.salud ?? 0,
      d.pension_empleado ?? 0,
      d.pension ?? 0,
      d.fsp ?? 0,
      d.arl ?? 0,
      d.ccf ?? 0,
      d.sena ?? 0,
      d.icbf ?? 0,
      d.total_planilla ?? 0,
    ]);
    const csv = [header.join(';'), ...filas.map((f) => f.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla-nomina-${n.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Descarga el archivo plano (detalle o empleado×concepto) desde el snapshot;
  // va como blob autenticado porque el endpoint exige el token
  descargarPlano(conceptos: boolean) {
    const n = this.nomina();
    if (!n) return;
    const a = document.createElement('a');
    a.download = conceptos
      ? `nomina-detalle-conceptos-${n.id}.txt`
      : `nomina-detalle-${n.id}.txt`;
    this.api.descargarPlanoNomina(n.id, conceptos).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.click();
        URL.revokeObjectURL(u);
      },
      error: () => this.snack.open('No se pudo generar el plano', 'Cerrar'),
    });
  }

  totalNeto(): number {
    return this.detalles().reduce((sum, d) => {
      const storedNeto = Number(d.neto_pagar) || Number(d.neto) || 0;
      return sum + storedNeto;
    }, 0);
  }

  alertasDe(d: NominaDetalle): string[] {
    if (!d.alertas) return [];
    try { return typeof d.alertas === 'string' ? JSON.parse(d.alertas) : d.alertas; }
    catch { return []; }
  }

  novedadesDe(d: NominaDetalle): { tipo?: string; dias?: number; descripcion?: string }[] {
    if (!d.novedades_detalle) return [];
    try { return typeof d.novedades_detalle === 'string' ? JSON.parse(d.novedades_detalle) : d.novedades_detalle as never[]; }
    catch { return []; }
  }

  hayAlertas(): boolean {
    return this.detalles().some((d) => this.alertasDe(d).length > 0);
  }

  imprimirDesprendible(detalle: NominaDetalle) {
    this.printSlip.set(detalle);
    window.addEventListener('afterprint', () => this.printSlip.set(null), { once: true });
    requestAnimationFrame(() => window.print());
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.nomina(id).subscribe({
      next: (res) => {
        this.nomina.set(res.nomina);
        this.detalles.set(res.detalles);
        this.loading.set(false);
        if (this.isAdmin() && res.nomina?.empresa_id) {
          this.api.pilaEstado(res.nomina.empresa_id).subscribe({
            next: (e) => this.pilaEstado.set(e),
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
