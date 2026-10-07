import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { CatalogoItem, Empleado, Incapacidad } from '@/app/models/empleado.model';

@Component({
  selector: 'incapacidad-dialog',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './incapacidad.dialog.html',
})
export class IncapacidadDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<IncapacidadDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empleado: Empleado; incapacidades?: Incapacidad[] }>(MAT_DIALOG_DATA, { optional: true })
    ?? {} as { empleado: Empleado; incapacidades?: Incapacidad[] };
  eps = signal<CatalogoItem[]>([]);
  arl = signal<CatalogoItem[]>([]);
  saving = false;

  form = this.fb.group({
    eps_id: [this.data.empleado.eps_id ?? null as number | null],
    arl_id: [this.data.empleado.arl_id ?? null as number | null],
    fecha_inicio: [null as Date | null, Validators.required],
    fecha_fin: [null as Date | null, Validators.required],
    fecha_expedicion: [null as Date | null],
    tipo: ['comun'],
    prorroga: [false],
    prorroga_de_id: [null as number | null],
    retroactiva: [false],
    numero_certificado: [''],
    valor: [null as number | null],
    // Checkbox "¿reportar al trabajador?" → el API envía el correo
    notificar_trabajador: [false],
  });

  constructor() {
    this.onTipoChange('comun');
    this.api.catalogos().subscribe((c) => {
      this.eps.set(c['eps'] ?? []);
      this.arl.set(c['arl'] ?? []);
    });
  }

  private isoDate(value: Date | string | null): string | null {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    return null;
  }

  diasCalculados(): number | null {
    const inicio = this.isoDate(this.form.controls.fecha_inicio.value);
    const fin = this.isoDate(this.form.controls.fecha_fin.value);
    if (!inicio || !fin) return null;
    const desde = Date.parse(`${inicio}T00:00:00Z`);
    const hasta = Date.parse(`${fin}T00:00:00Z`);
    return hasta < desde ? null : Math.floor((hasta - desde) / 86_400_000) + 1;
  }

  prorrogaOptions(): Incapacidad[] {
    const tipo = this.form.controls.tipo.value;
    if (tipo !== 'comun' && tipo !== 'laboral') return [];
    return (this.data.incapacidades ?? []).filter(i => i.tipo === tipo && !!i.fecha_fin);
  }

  onTipoChange(tipo: string) {
    const requiereCertificado = ['comun', 'laboral', 'maternidad', 'paternidad'].includes(tipo);
    const expedicion = this.form.controls.fecha_expedicion;
    if (requiereCertificado) expedicion.setValidators([Validators.required]);
    else expedicion.clearValidators();
    expedicion.updateValueAndValidity({ emitEvent: false });

    if (tipo !== 'comun' && tipo !== 'laboral') {
      this.form.patchValue({
        eps_id: ['maternidad', 'paternidad'].includes(tipo) ? (this.data.empleado.eps_id ?? null) : null,
        arl_id: null,
        prorroga: false,
        prorroga_de_id: null,
      });
    } else if (tipo === 'comun') {
      this.form.patchValue({ eps_id: this.data.empleado.eps_id ?? null, arl_id: null });
    } else {
      this.form.patchValue({ eps_id: null, arl_id: this.data.empleado.arl_id ?? null });
    }
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const inicio = this.isoDate(v.fecha_inicio);
    const fin = this.isoDate(v.fecha_fin);
    if (!inicio || !fin || this.diasCalculados() === null) {
      this.snack.open('La fecha fin debe ser igual o posterior a la fecha inicio', 'Cerrar', { duration: 3500 });
      return;
    }
    if (v.prorroga && !v.prorroga_de_id) {
      this.snack.open('Selecciona la incapacidad anterior que se está prorrogando', 'Cerrar', { duration: 3500 });
      return;
    }
    this.saving = true;

    this.api
      .addIncapacidad(this.data.empleado.id, {
        eps_id: v.eps_id ?? undefined,
        arl_id: v.arl_id ?? undefined,
        fecha_inicio: inicio,
        fecha_fin: fin,
        fecha_expedicion: this.isoDate(v.fecha_expedicion) ?? undefined,
        tipo: v.tipo ?? 'comun',
        dias: this.diasCalculados() ?? undefined,
        prorroga_de_id: v.prorroga ? (v.prorroga_de_id ?? undefined) : undefined,
        retroactiva: v.retroactiva ?? false,
        numero_certificado: String(v.numero_certificado ?? '').trim() || undefined,
        valor: v.valor ?? undefined,
        notificar_trabajador: v.notificar_trabajador ?? false,
      })
      .subscribe({
        next: () => {
          this.snack.open('Incapacidad reportada', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo guardar', 'Cerrar');
        },
      });
  }
}
