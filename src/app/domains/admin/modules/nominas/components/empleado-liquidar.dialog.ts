import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Empleado } from '@/app/models/empleado.model';

// Replica de los modales viejos (diasLaborados, DeduccionesModal,
// ingresoNocComponent) en un solo dialog por empleado.
@Component({
  selector: 'empleado-liquidar-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CurrencyPipe,
    DialogHeader,
  ],
  template: `
    <dialog-header
      [title]="data.empleado.primer_nombre + ' ' + (data.empleado.primer_apellido || '')"
    />

    <mat-dialog-content class="mat-typography">
      <div class="mb-3 text-sm text-neutral-500">
        Salario base:
        <b>{{ data.empleado.salario_base | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</b>
      </div>
      <form
        [formGroup]="form"
        class="grid grid-cols-2 gap-x-4"
      >
        <mat-form-field appearance="outline">
          <mat-label>Días laborados</mat-label>
          <input
            matInput
            type="number"
            min="0"
            max="30"
            formControlName="dias_laborados"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Horas extras ($)</mat-label>
          <input
            matInput
            type="number"
            formControlName="horas_extras"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Otros ingresos ($)</mat-label>
          <input
            matInput
            type="number"
            formControlName="otros_ingresos"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ingreso no constitutivo ($)</mat-label>
          <input
            matInput
            type="number"
            formControlName="ingreso_noc"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Deducciones ($)</mat-label>
          <input
            matInput
            type="number"
            formControlName="deducciones"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Indemnización ($)</mat-label>
          <input
            matInput
            type="number"
            formControlName="indemnizacion"
          />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="text" mat-dialog-close>Cancelar</button>
      <button
        matButton="filled"
        (click)="apply()"
      >
        Aplicar
      </button>
    </mat-dialog-actions>
  `,
})
export class EmpleadoLiquidarDialog {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<EmpleadoLiquidarDialog>);

  data = inject<{
    empleado: Empleado;
    input?: {
      dias_laborados?: number;
      horas_extras?: number;
      otros_ingresos?: number;
      ingreso_noc?: number;
      deducciones?: number;
      indemnizacion?: number;
    };
  }>(MAT_DIALOG_DATA);

  form = this.fb.group({
    dias_laborados: [this.data.input?.dias_laborados ?? 30],
    horas_extras: [this.data.input?.horas_extras ?? 0],
    otros_ingresos: [this.data.input?.otros_ingresos ?? 0],
    ingreso_noc: [this.data.input?.ingreso_noc ?? 0],
    deducciones: [this.data.input?.deducciones ?? 0],
    indemnizacion: [this.data.input?.indemnizacion ?? 0],
  });

  apply() {
    this.ref.close(this.form.getRawValue());
  }
}
