import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { Empleado } from '@/app/models/empleado.model';

const PARENTESCOS = [
  'Cónyuge',
  'Hijo(a)',
  'Padre',
  'Madre',
  'Hermano(a)',
  'Otro',
];

@Component({
  selector: 'beneficiario-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    DialogHeader,
  ],
  template: `
    <dialog-header title="Información beneficiario" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid grid-cols-2 gap-x-4 pt-2"
      >
        <mat-form-field class="col-span-2" appearance="outline">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombre" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Parentesco</mat-label>
          <mat-select formControlName="parentesco">
            @for (p of parentescos; track p) {
              <mat-option [value]="p">{{ p }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>N° documento</mat-label>
          <input matInput formControlName="num_documento" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha de nacimiento</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="fecha_nacimiento"
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="text" mat-dialog-close>Cancelar</button>
      <button
        matButton="filled"
        [disabled]="form.invalid || saving"
        (click)="save()"
      >
        Agregar
      </button>
    </mat-dialog-actions>
  `,
})
export class BeneficiarioDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<BeneficiarioDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empleado: Empleado }>(MAT_DIALOG_DATA);
  parentescos = PARENTESCOS;
  saving = false;

  form = this.fb.group({
    nombre: ['', Validators.required],
    parentesco: [''],
    num_documento: [''],
    fecha_nacimiento: [''],
  });

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    this.api
      .addBeneficiario(this.data.empleado.id, {
        nombre: v.nombre!,
        parentesco: v.parentesco || undefined,
        num_documento: v.num_documento || undefined,
        fecha_nacimiento: v.fecha_nacimiento
          ? new Date(v.fecha_nacimiento).toISOString().slice(0, 10)
          : undefined,
      })
      .subscribe({
        next: () => {
          this.snack.open('Beneficiario agregado', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo guardar', 'Cerrar');
        },
      });
  }
}
