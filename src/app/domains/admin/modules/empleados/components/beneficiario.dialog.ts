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
  templateUrl: './beneficiario.dialog.html',
})
export class BeneficiarioDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<BeneficiarioDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empleado: Empleado }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { empleado: Empleado };
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
