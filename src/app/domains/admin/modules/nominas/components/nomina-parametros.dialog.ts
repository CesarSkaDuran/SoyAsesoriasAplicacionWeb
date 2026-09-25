import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { NominaParametros } from '@/app/models/empleado.model';

const PARAMETER_GROUPS = [
  {
    title: 'Valores anuales',
    fields: [
      ['salario_minimo', 'Salario mínimo mensual (COP)'],
      ['auxilio_transporte', 'Auxilio de transporte (COP)'],
      ['auxilio_tope_smmlv', 'Tope auxilio (SMMLV)'],
      ['max_ibc_smmlv', 'Tope máximo IBC (SMMLV)'],
      ['uvt', 'UVT (COP)'],
      ['limite_no_salarial_pct', 'Límite pagos no salariales (%)'],
    ],
  },
  {
    title: 'Deducciones del trabajador (%)',
    fields: [
      ['salud_empleado_pct', 'Salud trabajador'],
      ['pension_empleado_pct', 'Pensión trabajador'],
    ],
  },
  {
    title: 'Aportes del empleador (%)',
    fields: [
      ['salud_empleador_pct', 'Salud empleador'],
      ['pension_empleador_pct', 'Pensión empleador'],
      ['arl_i_pct', 'ARL clase I'],
      ['arl_ii_pct', 'ARL clase II'],
      ['arl_iii_pct', 'ARL clase III'],
      ['arl_iv_pct', 'ARL clase IV'],
      ['arl_v_pct', 'ARL clase V'],
      ['caja_pct', 'Caja de compensación'],
      ['sena_pct', 'SENA'],
      ['icbf_pct', 'ICBF'],
    ],
  },
  {
    title: 'Provisiones (%)',
    fields: [
      ['prima_pct', 'Prima de servicios'],
      ['cesantias_pct', 'Cesantías'],
      ['intereses_cesantias_pct_anual', 'Intereses cesantías (anual)'],
      ['vacaciones_pct', 'Vacaciones'],
    ],
  },
  {
    title: 'Fondo de solidaridad pensional (%)',
    fields: [
      ['fsp_tope_inicial_smmlv', 'Umbral inicial (SMMLV)'],
      ['fsp_4_16_pct', 'Desde umbral hasta 16 SMMLV'],
      ['fsp_16_17_pct', 'De 16 a 17 SMMLV'],
      ['fsp_17_18_pct', 'De 17 a 18 SMMLV'],
      ['fsp_18_19_pct', 'De 18 a 19 SMMLV'],
      ['fsp_19_20_pct', 'De 19 a 20 SMMLV'],
      ['fsp_mas_20_pct', 'Más de 20 SMMLV'],
    ],
  },
  {
    title: 'Retención en la fuente (art. 383 ET)',
    fields: [
      ['retencion_exenta_pct', 'Renta exenta (%)'],
      ['retencion_exenta_tope_uvt', 'Tope renta exenta (UVT/mes)'],
    ],
  },
  {
    title: 'Horas extras y recargos (%)',
    fields: [
      ['extra_diurna_pct', 'Extra diurna'],
      ['extra_nocturna_pct', 'Extra nocturna'],
      ['recargo_nocturno_pct', 'Recargo nocturno ordinario'],
      ['extras_max_diarias', 'Tope extras por día (h)'],
      ['extras_max_semanales', 'Tope extras por semana (h)'],
    ],
  },
  {
    title: 'Incapacidades y licencias',
    fields: [
      ['incapacidad_comun_dias_empleador', 'Días a cargo del empleador (común)'],
      ['incapacidad_comun_eps_pct', 'EPS paga desde ahí (%)'],
      ['incapacidad_excedente_pct', 'Excedente hasta 100% a cargo del empleador (%)'],
      ['incapacidad_laboral_dias_empleador', 'Días a cargo del empleador (laboral)'],
      ['incapacidad_laboral_pct', 'ARL paga (%)'],
      ['licencia_maternidad_dias', 'Licencia maternidad (días)'],
      ['licencia_paternidad_dias', 'Licencia paternidad (días)'],
    ],
  },
] as const;

const JSON_GROUPS = [
  ['retencion_tabla', 'Tabla art. 383 ET (tramos en UVT)'],
  ['jornada_cortes', 'Jornada semanal por fecha de corte'],
  ['dominical_cortes', 'Recargo dominical/festivo por fecha de corte'],
] as const;

@Component({
  selector: 'nomina-parametros-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DialogHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nomina-parametros.dialog.html',
})
export class NominaParametrosDialog {
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<NominaParametrosDialog>);
  private snack = inject(MatSnackBar);
  vigencia = inject<number>(MAT_DIALOG_DATA);
  groups = PARAMETER_GROUPS;
  jsonGroups = JSON_GROUPS;
  loading = signal(true);
  saving = signal(false);
  jsonError = signal<string | null>(null);
  sourceControl = new FormControl('', { nonNullable: true });
  jsonControls: Record<string, FormControl<string>> = {};
  form = new FormGroup<Record<string, FormControl<number>>>({});

  constructor() {
    for (const group of this.groups) {
      for (const [key] of group.fields) {
        this.form.addControl(key, new FormControl(0, { nonNullable: true }));
      }
    }
    for (const [key] of this.jsonGroups) {
      this.jsonControls[key] = new FormControl('', { nonNullable: true });
    }
    this.api.nominaParametros(this.vigencia).subscribe({
      next: ({ parametros }) => {
        this.form.patchValue(parametros as unknown as Record<string, number>);
        this.sourceControl.setValue(parametros.fuente_normativa || '');
        for (const [key] of this.jsonGroups) {
          const raw = (parametros as unknown as Record<string, unknown>)[key];
          const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw ?? []);
          this.jsonControls[key].setValue(JSON.stringify(parsed, null, 2));
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(err?.error?.error || 'No se pudieron cargar los parámetros', 'Cerrar');
      },
    });
  }

  save() {
    if (this.form.invalid) return;
    const json: Record<string, unknown> = {};
    for (const [key] of this.jsonGroups) {
      try {
        const parsed = JSON.parse(this.jsonControls[key].value || '[]');
        if (!Array.isArray(parsed)) throw new Error('not-array');
        json[key] = parsed;
      } catch {
        this.jsonError.set(`El JSON de "${key}" no es válido`);
        return;
      }
    }
    this.jsonError.set(null);
    this.saving.set(true);
    this.api.updateNominaParametros(this.vigencia, {
      ...this.form.getRawValue(),
      ...json,
      fuente_normativa: this.sourceControl.value,
    } as Partial<NominaParametros>).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Parámetros guardados', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.error || 'No se pudieron guardar los parámetros', 'Cerrar');
      },
    });
  }
}
