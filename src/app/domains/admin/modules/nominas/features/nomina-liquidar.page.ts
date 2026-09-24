import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import {
  ConceptoNomina,
  CorteFecha,
  Empleado,
  HoraExtraInput,
  Incapacidad,
  Nomina,
  NominaParametros,
  RetencionTramo,
} from '@/app/models/empleado.model';
import { EmpleadoLiquidarDialog, LiquidacionInput } from '../components/empleado-liquidar.dialog';

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function corteVigente(cortes: CorteFecha[] | string | null | undefined, key: 'horas_semanales' | 'pct', fecha?: string | null): number | null {
  const list = parseJson<CorteFecha[]>(cortes, [])
    .filter((c) => c && c.desde && c[key] != null)
    .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
  let value: number | null = null;
  for (const c of list) {
    if (!fecha || String(c.desde).slice(0, 10) <= fecha) value = Number(c[key]);
  }
  return value;
}

const EXTRA_TIPOS = new Set(['diurna', 'nocturna', 'extra_diurna_dominical', 'extra_nocturna_dominical']);
const diffDias = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

@Component({
  selector: 'nomina-liquidar-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTableModule,
    MatProgressSpinner,
    CurrencyPipe,
    PageHeader,
  ],
  templateUrl: './nomina-liquidar.page.html',
})
export default class NominaLiquidarPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  nomina = signal<Nomina | null>(null);
  empleados = signal<Empleado[]>([]);
  inputs = signal<Record<number, LiquidacionInput>>({});
  parametros = signal<NominaParametros | null>(null);
  novedades = signal<Incapacidad[]>([]);
  conceptos = signal<ConceptoNomina[]>([]);
  periodoFechas = signal<{ inicio: string; fin: string } | null>(null);
  loading = signal(true);
  saving = signal(false);
  nominaId = '';

  columns = ['nombre', 'salario', 'dias', 'auxilio', 'horas', 'otros', 'deducciones', 'neto', 'acciones'];

  constructor() {
    this.nominaId = this.route.snapshot.paramMap.get('id')!;
    this.api.nomina(this.nominaId).subscribe({
      next: (r) => {
        this.nomina.set(r.nomina);
        // Pre-cargar inputs desde el detalle ya liquidado (reliquidacion)
        const map: Record<number, LiquidacionInput> = {};
        for (const d of r.detalles || []) {
          const recargos = parseJson<{ tipo: string; cantidad: number; fecha?: string; valor?: number }[]>(d.recargos_detalle, []);
          const ingresosDet = parseJson<{
            concepto_id?: number | null;
            valor: number;
            constitutivo_salario?: boolean;
          }[]>(d.ingresos_detalle, []);
          const salTipificado = ingresosDet
            .filter((g) => g.constitutivo_salario)
            .reduce((t, g) => t + Number(g.valor || 0), 0);
          const nocTipificado = ingresosDet
            .filter((g) => !g.constitutivo_salario)
            .reduce((t, g) => t + Number(g.valor || 0), 0);
          map[d.empleado_id] = {
            dias_laborados: Number(d.dias_laborados ?? 0) + Number(d.dias_incapacidad ?? 0) || Number(r.nomina.dias_periodo ?? 30),
            horas: recargos.map((h) => ({ tipo: h.tipo, cantidad: h.cantidad, fecha: h.fecha })),
            horas_extras: Math.max(0, Number(d.horas_extras) - recargos.reduce((t, h) => t + Number(h.valor || 0), 0)) || 0,
            ingresos: ingresosDet
              .filter((g) => g.concepto_id != null)
              .map((g) => ({ concepto_id: Number(g.concepto_id), valor: Number(g.valor) })),
            otros_ingresos: Math.max(0, Number(d.otros_ingresos) - salTipificado) || 0,
            ingreso_noc: Math.max(0, Number(d.ingreso_noc) - nocTipificado) || 0,
            ingreso_noc_incr: d.ingreso_noc_incr === true || d.ingreso_noc_incr === 1,
            ingreso_noc_incr_motivo: d.ingreso_noc_incr_motivo || '',
            deducciones: Number(d.deducciones) || 0,
            descuentos: parseJson<{ tipo: string; concepto: string; valor: number }[]>(
              d.deducciones_detalle, [],
            ).map((x) => ({ tipo: x.tipo, concepto: x.concepto, valor: Number(x.valor) })),
            retencion_ajuste: Number(d.retencion_ajuste) || 0,
            retencion_ajuste_motivo: d.retencion_ajuste_motivo || '',
            indemnizacion: Number(d.indemnizacion) || 0,
          };
        }
        this.inputs.set(map);
        this.api.conceptosNomina().subscribe({
          next: (r3) => this.conceptos.set(r3.data || []),
        });
        this.api.nominaParametros(r.nomina.vigencia || new Date().getFullYear()).subscribe({
          next: ({ parametros }) => {
            this.parametros.set(parametros);
            this.loadEmpleados(r.nomina.empresa_id);
          },
          error: (err) => {
            this.loading.set(false);
            this.snack.open(err?.error?.error || 'Faltan parámetros para la vigencia de esta nómina', 'Cerrar', { duration: 5000 });
          },
        });
        this.api.nominaNovedades(this.nominaId).subscribe({
          next: (r2) => {
            this.periodoFechas.set(r2.fechas);
            this.novedades.set(r2.novedades || []);
          },
        });
      },
      error: () => this.loading.set(false),
    });
  }

  private loadEmpleados(empresaId: number) {
    this.api.empleados(empresaId, undefined, 1, 'activo').subscribe({
      next: (r) => {
        this.empleados.set(r.data.filter((e) => !['prestacion', 'aprendizaje'].includes(e.tipo_contrato || '')));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  novedadesDe(empleadoId: number): Incapacidad[] {
    return this.novedades().filter((n) => n.empleado_id === empleadoId);
  }

  // Días de novedad dentro del período, con su split empleador/tercero (espejo del backend)
  private novedadCalc(empleadoId: number, salarioMes: number, diasPeriodo: number) {
    const fechas = this.periodoFechas();
    const p = this.parametros();
    if (!fechas || !p) return { dias: 0, valorEmpleador: 0, valorTercero: 0 };
    const dia = salarioMes / 30;
    let dias = 0; let vEmp = 0; let vTer = 0;
    for (const n of this.novedadesDe(empleadoId)) {
      const fi = String(n.fecha_inicio).slice(0, 10);
      const ff = n.fecha_fin ? String(n.fecha_fin).slice(0, 10) : fechas.fin;
      const desde = fi > fechas.inicio ? fi : fechas.inicio;
      const hasta = ff < fechas.fin ? ff : fechas.fin;
      const d = Math.min(Math.max(0, diffDias(desde, hasta) + 1), diasPeriodo - dias);
      if (!d) continue;
      const previos = Math.max(0, diffDias(fi, fechas.inicio));
      let dEmp = 0; let dTer = 0; let pctT = 100; let exc = 0;
      if (n.tipo === 'no_remunerada') { dias += d; continue; }
      if (n.tipo === 'vacaciones') { continue; } // remuneradas: no reducen días
      if (n.tipo === 'laboral') {
        dEmp = Math.min(d, Math.max(0, Number(p.incapacidad_laboral_dias_empleador ?? 1) - previos));
        dTer = d - dEmp; pctT = Number(p.incapacidad_laboral_pct ?? 100);
      } else if (n.tipo === 'maternidad' || n.tipo === 'paternidad') {
        dTer = d;
      } else {
        dEmp = Math.min(d, Math.max(0, Number(p.incapacidad_comun_dias_empleador ?? 2) - previos));
        dTer = d - dEmp;
        pctT = Number(p.incapacidad_comun_eps_pct ?? 66.67);
        exc = Number(p.incapacidad_excedente_pct ?? 0);
      }
      dias += d;
      vEmp += dEmp * dia + dTer * dia * exc / 100;
      vTer += dTer * dia * pctT / 100;
    }
    return { dias, valorEmpleador: vEmp, valorTercero: vTer };
  }

  private horasValor(e: Empleado): { valor: number; extras: number } {
    const p = this.parametros();
    const input = this.inputs()[e.id] || {};
    if (!p) return { valor: 0, extras: 0 };
    const salario = Number(e.salario_base) || 0;
    let valor = 0; let extras = 0;
    for (const h of input.horas || []) {
      const cantidad = Number(h.cantidad) || 0;
      if (!cantidad) continue;
      const fecha = h.fecha || this.periodoFechas()?.inicio || undefined;
      const jornada = corteVigente(p.jornada_cortes, 'horas_semanales', fecha) ?? 48;
      const dom = (corteVigente(p.dominical_cortes, 'pct', fecha) ?? 75) / 100;
      const hora = salario / (jornada * 5);
      const extD = Number(p.extra_diurna_pct ?? 25) / 100;
      const extN = Number(p.extra_nocturna_pct ?? 75) / 100;
      const recN = Number(p.recargo_nocturno_pct ?? 35) / 100;
      const factor = {
        diurna: 1 + extD,
        nocturna: 1 + extN,
        extra_diurna_dominical: 1 + extD + dom,
        extra_nocturna_dominical: 1 + extN + dom,
        recargo_nocturno: recN,
        dominical: dom,
        festiva: dom,
        nocturna_dominical: dom + recN,
      }[h.tipo];
      if (factor === undefined) continue;
      valor += hora * cantidad * factor;
      if (EXTRA_TIPOS.has(h.tipo)) extras += cantidad;
    }
    return { valor, extras };
  }

  private retencionEstimada(e: Empleado, ctx: { base: number; aportes: number; factor: number }): number {
    const p = this.parametros();
    if (!p || !ctx.factor || ctx.base <= 0) return 0;
    const uvt = Number(p.uvt) || 0;
    if (!uvt) return 0;
    const depurado = Math.max(0, ctx.base - ctx.aportes) * ctx.factor;
    const exenta = Math.min(depurado * Number(p.retencion_exenta_pct ?? 25) / 100, uvt * Number(p.retencion_exenta_tope_uvt ?? 240));
    const baseUvt = Math.max(0, depurado - exenta) / uvt;
    const tramo = parseJson<RetencionTramo[]>(p.retencion_tabla, [])
      .find((t) => baseUvt > Number(t.desde) && (t.hasta == null || baseUvt <= Number(t.hasta)));
    if (!tramo || !Number(tramo.tarifa)) return 0;
    const uvtImp = (baseUvt - Number(tramo.resta_uvt || 0)) * Number(tramo.tarifa) / 100 + Number(tramo.suma_uvt || 0);
    return Math.max(0, uvtImp * uvt) / ctx.factor;
  }

  private calcularEstimado(e: Empleado) {
    const input = this.inputs()[e.id] || {};
    const p = this.parametros();
    if (!p) return { neto: 0, deducciones: 0, auxilio: 0, horas: 0, retencion: 0, diasNov: 0 };
    const dias = input.dias_laborados ?? this.nomina()?.dias_periodo ?? 30;
    const salarioMes = Number(e.salario_base) || 0;
    const nov = this.novedadCalc(e.id, salarioMes, dias);
    const diasTrab = Math.max(0, dias - nov.dias);
    const salario = salarioMes / 30 * diasTrab;
    const valorIncap = nov.valorEmpleador + nov.valorTercero;
    const mode = e.auxilio_transporte_mode ?? (e.subsidio_transporte ? 'si' : 'automatico');
    const auxilio = mode !== 'no' && salarioMes <= p.salario_minimo * p.auxilio_tope_smmlv
      ? p.auxilio_transporte * diasTrab / 30
      : 0;
    const horas = this.horasValor(e).valor + (input.horas_extras ?? 0);
    // Conceptos tipificados: salarial suma a 'otros'; no salarial se divide en
    // gravable/INCR según tratamiento_fiscal del catálogo
    const conceptoMap = new Map(this.conceptos().map((c) => [c.id, c]));
    const uvt = Number(p.uvt) || 0;
    let ingSalarial = 0; let nocGravable = 0; let nocIncr = 0;
    for (const g of input.ingresos || []) {
      const v = Number(g.valor) || 0;
      if (!v) continue;
      const c = conceptoMap.get(Number(g.concepto_id));
      if (c && !c.constitutivo_salario) {
        let incrParte = 0;
        if (c.tratamiento_fiscal === 'incr') {
          const cond = Number(c.condicion_salario_uvt) || 0;
          const cumple = !cond || !uvt || salarioMes <= uvt * cond;
          if (cumple) {
            const limite = Number(c.limite_incr_uvt) || 0;
            const tope = limite && uvt ? uvt * limite * (dias / 30) : Infinity;
            incrParte = Math.min(v, tope);
          }
        }
        nocIncr += incrParte;
        nocGravable += v - incrParte;
      } else {
        ingSalarial += v;
      }
    }
    const otros = (input.otros_ingresos ?? 0) + ingSalarial;
    const ingresoNoc = (input.ingreso_noc ?? 0) + nocGravable + nocIncr;
    const remuneracion = salario + valorIncap + horas + otros + ingresoNoc;
    const excesoNoSalarial = Math.max(0, ingresoNoc - remuneracion * p.limite_no_salarial_pct / 100);
    const ibc = Math.min(
      salario + valorIncap + horas + otros + excesoNoSalarial,
      p.salario_minimo * p.max_ibc_smmlv * dias / 30,
    );
    const factor = dias > 0 ? 30 / dias : 0;
    const ibcMensualizado = ibc * factor;
    const multiples = ibcMensualizado / p.salario_minimo;
    const fspRate = multiples >= 20 ? p.fsp_mas_20_pct
      : multiples >= 19 ? p.fsp_19_20_pct
        : multiples >= 18 ? p.fsp_18_19_pct
          : multiples >= 17 ? p.fsp_17_18_pct
            : multiples >= 16 ? p.fsp_16_17_pct
              : multiples >= p.fsp_tope_inicial_smmlv ? p.fsp_4_16_pct : 0;
    const aportes = ibc * (p.salud_empleado_pct + p.pension_empleado_pct + fspRate) / 100;
    const baseRet = salario + valorIncap + horas + otros + nocGravable
      + (input.ingreso_noc_incr ? 0 : (input.ingreso_noc ?? 0));
    const retencion = this.retencionEstimada(e, { base: baseRet, aportes, factor }) + (input.retencion_ajuste ?? 0);
    const deducciones = aportes + (input.deducciones ?? 0) + Math.max(0, retencion);
    return {
      neto: salario + valorIncap + auxilio + horas + otros + ingresoNoc + (input.indemnizacion ?? 0) - deducciones,
      deducciones,
      auxilio,
      horas,
      retencion: Math.max(0, retencion),
      diasNov: nov.dias,
    };
  }

  neto(e: Empleado): number {
    return this.calcularEstimado(e).neto;
  }

  deduccionesEmpleado(e: Empleado): number {
    return this.calcularEstimado(e).deducciones;
  }

  auxilioEstimado(e: Empleado): number {
    return this.calcularEstimado(e).auxilio;
  }

  horasEstimado(e: Empleado): number {
    return this.calcularEstimado(e).horas;
  }

  retencionDe(e: Empleado): number {
    return this.calcularEstimado(e).retencion;
  }

  diasNovedad(e: Empleado): number {
    return this.calcularEstimado(e).diasNov;
  }

  totalEstimado() {
    return this.empleados().reduce((total, e) => total + this.neto(e), 0);
  }

  totalHoras() {
    return this.empleados().reduce((a, e) => a + this.horasEstimado(e), 0);
  }

  totalDed() {
    return this.empleados().reduce((total, e) => total + this.deduccionesEmpleado(e), 0);
  }

  totalNovedades(): number {
    return this.empleados().filter((e) => this.novedadesDe(e.id).length > 0).length;
  }

  openEmpleado(e: Empleado) {
    this.dialog
      .open(EmpleadoLiquidarDialog, {
        width: '680px',
        data: {
          empleado: e,
          input: this.inputs()[e.id],
          diasPeriodo: this.nomina()?.dias_periodo ?? 30,
          fechaInicio: this.periodoFechas()?.inicio,
          parametros: this.parametros(),
          novedades: this.novedadesDe(e.id),
          retencionEstimada: this.retencionDe(e),
          conceptos: this.conceptos(),
        },
      })
      .afterClosed()
      .subscribe((input: LiquidacionInput | undefined) => {
        if (!input) return;
        this.inputs.update((m) => ({ ...m, [e.id]: input }));
      });
  }

  liquidar() {
    this.saving.set(true);
    const items = this.empleados().map((e) => ({
      empleado_id: e.id,
      ...this.inputs()[e.id],
    }));
    this.api.liquidarNomina(this.nominaId, { empleados: items }).subscribe({
      next: (res) => {
        if (res.alertas?.length) {
          this.snack.open(`Liquidada con ${res.alertas.length} advertencia(s)`, 'OK', { duration: 4000 });
        } else {
          this.snack.open('Nómina liquidada', 'OK', { duration: 3000 });
        }
        this.router.navigate(['/admin/nominas', this.nominaId]);
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('No se pudo liquidar', 'Cerrar');
      },
    });
  }
}
