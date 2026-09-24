import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import {
  ConceptoNomina,
  CorteFecha,
  Empleado,
  HoraExtraInput,
  Incapacidad,
  IngresoConceptoInput,
  NominaParametros,
} from '@/app/models/empleado.model';

export interface LiquidacionInput {
  dias_laborados?: number;
  horas_extras?: number;
  horas?: HoraExtraInput[];
  ingresos?: IngresoConceptoInput[];
  otros_ingresos?: number;
  ingreso_noc?: number;
  ingreso_noc_incr?: boolean;
  ingreso_noc_incr_motivo?: string;
  deducciones?: number;
  descuentos?: DescuentoInput[];
  vacaciones_base?: number;
  vacaciones_motivo?: string;
  retencion_ajuste?: number;
  retencion_ajuste_motivo?: string;
  indemnizacion?: number;
}

interface DialogData {
  empleado: Empleado;
  diasPeriodo?: number;
  fechaInicio?: string | null;
  input?: LiquidacionInput;
  novedades?: Incapacidad[];
  parametros?: NominaParametros | null;
  retencionEstimada?: number;
  conceptos?: ConceptoNomina[];
}

export interface DescuentoInput {
  tipo: string;
  concepto: string;
  valor: number;
}

// Topes legales por tipo (CST 154-156; Ley 1527/2012) — el motor evalúa
// el acumulado del período y alerta sin bloquear.
export const DESCUENTO_TIPOS: { value: string; label: string; hint: string }[] = [
  { value: 'embargo', label: 'Embargo judicial', hint: 'Tope: 1/5 del excedente sobre el SMMLV' },
  { value: 'libranza', label: 'Libranza / descuento directo', hint: 'Tope: 50% del neto tras descuentos de ley' },
  { value: 'cooperativa', label: 'Cooperativa / fondo de empleados', hint: 'Tope: 50% del salario' },
  { value: 'alimentos', label: 'Pensión alimenticia', hint: 'Tope: 50% del salario' },
  { value: 'prestamo', label: 'Préstamo / anticipo', hint: 'Sin tope legal' },
  { value: 'otro', label: 'Otro', hint: 'Sin tope legal' },
];

export const HORA_TIPOS: { value: string; label: string; extra: boolean }[] = [
  { value: 'diurna', label: 'Hora extra diurna', extra: true },
  { value: 'nocturna', label: 'Hora extra nocturna', extra: true },
  { value: 'recargo_nocturno', label: 'Recargo nocturno (jornada ordinaria)', extra: false },
  { value: 'dominical', label: 'Dominical/festivo (jornada ordinaria)', extra: false },
  { value: 'nocturna_dominical', label: 'Nocturno en dominical/festivo', extra: false },
  { value: 'extra_diurna_dominical', label: 'Extra diurna en dominical/festivo', extra: true },
  { value: 'extra_nocturna_dominical', label: 'Extra nocturna en dominical/festivo', extra: true },
];

const NOVEDAD_LABELS: Record<string, string> = {
  comun: 'Incapacidad origen común (EPS)',
  laboral: 'Incapacidad laboral (ARL)',
  maternidad: 'Licencia de maternidad',
  paternidad: 'Licencia de paternidad',
  no_remunerada: 'Licencia no remunerada',
  vacaciones: 'Vacaciones disfrutadas',
  otra: 'Otra novedad',
};

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

// Replica de los modales viejos (diasLaborados, DeduccionesModal,
// ingresoNocComponent) en un solo dialog por empleado.
@Component({
  selector: 'empleado-liquidar-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIcon,
    CurrencyPipe,
    DatePipe,
    DialogHeader,
  ],
  templateUrl: './empleado-liquidar.dialog.html',
})
export class EmpleadoLiquidarDialog {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<EmpleadoLiquidarDialog>);

  data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true }) ?? ({} as DialogData);
  horaTipos = HORA_TIPOS;
  errorMsg = signal('');

  form = this.fb.group({
    dias_laborados: [this.data.input?.dias_laborados ?? this.data.diasPeriodo ?? 30],
    horas_extras: [this.data.input?.horas_extras ?? 0],
    otros_ingresos: [this.data.input?.otros_ingresos ?? 0],
    ingreso_noc: [this.data.input?.ingreso_noc ?? 0],
    ingreso_noc_incr: [this.data.input?.ingreso_noc_incr ?? false],
    ingreso_noc_incr_motivo: [this.data.input?.ingreso_noc_incr_motivo ?? ''],
    deducciones: [this.data.input?.deducciones ?? 0],
    vacaciones_base: [this.data.input?.vacaciones_base ?? null],
    vacaciones_motivo: [this.data.input?.vacaciones_motivo ?? ''],
    retencion_ajuste: [this.data.input?.retencion_ajuste ?? 0],
    retencion_ajuste_motivo: [this.data.input?.retencion_ajuste_motivo ?? ''],
    indemnizacion: [this.data.input?.indemnizacion ?? 0],
    horas: this.fb.array(
      (this.data.input?.horas ?? []).map((h) =>
        this.fb.group({
          tipo: [h.tipo || 'diurna'],
          cantidad: [h.cantidad ?? 0],
          fecha: [h.fecha || ''],
        })
      )
    ),
    ingresos: this.fb.array(
      (this.data.input?.ingresos ?? []).map((g) =>
        this.fb.group({
          concepto_id: [g.concepto_id ?? null],
          valor: [g.valor ?? 0],
        })
      )
    ),
    descuentos: this.fb.array(
      (this.data.input?.descuentos ?? []).map((d) =>
        this.fb.group({
          tipo: [d.tipo || 'otro'],
          concepto: [d.concepto || ''],
          valor: [d.valor ?? 0],
        })
      )
    ),
  });

  get horas(): FormArray {
    return this.form.get('horas') as FormArray;
  }

  get ingresos(): FormArray {
    return this.form.get('ingresos') as FormArray;
  }

  get descuentos(): FormArray {
    return this.form.get('descuentos') as FormArray;
  }

  descuentoTipos = DESCUENTO_TIPOS;

  descuentoHint(tipo: unknown): string {
    return DESCUENTO_TIPOS.find((t) => t.value === tipo)?.hint ?? '';
  }

  addDescuento() {
    this.descuentos.push(
      this.fb.group({ tipo: ['embargo'], concepto: [''], valor: [0] })
    );
  }

  removeDescuento(index: number) {
    this.descuentos.removeAt(index);
  }

  get conceptos(): ConceptoNomina[] {
    return this.data.conceptos ?? [];
  }

  get incrRequiereMotivo(): boolean {
    const v = this.form.value;
    return !!v.ingreso_noc_incr && Number(v.ingreso_noc) > 0;
  }

  conceptoDe(id: unknown): ConceptoNomina | undefined {
    return this.conceptos.find((c) => c.id === Number(id));
  }

  // Conceptos pendientes de verificación normativa: visibles pero no seleccionables.
  // El flag es el estado; el texto de la fuente es fallback por compatibilidad.
  conceptoBloqueado(c: ConceptoNomina): boolean {
    return !!c.activo_pendiente_verificacion
      || String(c.fuente_normativa || '').toLowerCase().includes('verificación');
  }

  addIngreso() {
    this.ingresos.push(
      this.fb.group({ concepto_id: [this.conceptos[0]?.id ?? null], valor: [0] })
    );
  }

  removeIngreso(index: number) {
    this.ingresos.removeAt(index);
  }

  get novedades(): Incapacidad[] {
    return this.data.novedades ?? [];
  }

  // Base manual obligatoria solo cuando el empleado tiene salario variable
  // y vacaciones en el período sin histórico de nómina (CST art. 192)
  get requiereBaseVacaciones(): boolean {
    return !!this.data.empleado?.salario_variable
      && this.novedades.some((n) => n.tipo === 'vacaciones');
  }

  novedadLabel(tipo?: string): string {
    return NOVEDAD_LABELS[tipo || 'otra'] || tipo || 'Novedad';
  }

  addHora() {
    this.horas.push(
      this.fb.group({ tipo: ['diurna'], cantidad: [0], fecha: [''] })
    );
  }

  removeHora(index: number) {
    this.horas.removeAt(index);
  }

  // Vista previa del valor de la fila según parámetros y fecha de corte
  valorHoraRow(index: number): number {
    const p = this.data.parametros;
    const row = this.horas.at(index)?.value;
    if (!p || !row?.cantidad) return 0;
    const salario = Number(this.data.empleado?.salario_base) || 0;
    const fecha = row.fecha || this.data.fechaInicio || undefined;
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
    }[row.tipo as string];
    return factor === undefined ? 0 : hora * Number(row.cantidad) * factor;
  }

  totalHorasTipadas(): number {
    return this.horas.controls.reduce((t, _, i) => t + this.valorHoraRow(i), 0);
  }

  apply() {
    const raw = this.form.getRawValue();
    const incrPlano = Number(raw.ingreso_noc) > 0 && raw.ingreso_noc_incr;
    if (incrPlano && !String(raw.ingreso_noc_incr_motivo || '').trim()) {
      this.errorMsg.set(
        'El INCR manual requiere un motivo. Para casos recurrentes usa el catálogo de conceptos.'
      );
      return;
    }
    const result: LiquidacionInput = {
      dias_laborados: raw.dias_laborados ?? undefined,
      horas_extras: raw.horas_extras ?? 0,
      otros_ingresos: raw.otros_ingresos ?? 0,
      ingreso_noc: raw.ingreso_noc ?? 0,
      ingreso_noc_incr: raw.ingreso_noc_incr ?? false,
      ingreso_noc_incr_motivo: raw.ingreso_noc_incr_motivo || '',
      deducciones: raw.deducciones ?? 0,
      vacaciones_base: Number(raw.vacaciones_base) > 0 ? Number(raw.vacaciones_base) : undefined,
      vacaciones_motivo: raw.vacaciones_motivo || '',
      retencion_ajuste: raw.retencion_ajuste ?? 0,
      retencion_ajuste_motivo: raw.retencion_ajuste_motivo || '',
      indemnizacion: raw.indemnizacion ?? 0,
      horas: (raw.horas || [])
        .filter((h) => Number(h?.cantidad) > 0)
        .map((h): HoraExtraInput => ({
          tipo: h.tipo || 'diurna',
          cantidad: Number(h.cantidad),
          fecha: h.fecha || undefined,
        })),
      ingresos: (raw.ingresos || [])
        .filter((g) => Number(g?.valor) > 0 && g?.concepto_id != null)
        .map((g): IngresoConceptoInput => ({
          concepto_id: Number(g.concepto_id),
          valor: Number(g.valor),
        })),
      descuentos: (raw.descuentos || [])
        .filter((d) => Number(d?.valor) > 0)
        .map((d): DescuentoInput => ({
          tipo: d.tipo || 'otro',
          concepto: String(d.concepto || '').trim() || 'Descuento',
          valor: Number(d.valor),
        })),
    };
    this.ref.close(result);
  }
}
