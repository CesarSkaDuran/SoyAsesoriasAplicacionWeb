import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Empleado } from '@/app/models/empleado.model';

@Component({
  selector: 'recontratar-dialog',
  imports: [DatePipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule,
    MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, DialogHeader],
  templateUrl: './recontratar.dialog.html',
})
export class RecontratarDialog {
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<RecontratarDialog>);
  private snack = inject(MatSnackBar);
  data = inject<{ empleado: Empleado }>(MAT_DIALOG_DATA);
  saving = false;
  form = new FormGroup({
    fecha_ingreso: new FormControl<Date | null>(new Date(), Validators.required),
    tipo_contrato: new FormControl(this.data.empleado.tipo_contrato || 'indefinido', { nonNullable: true, validators: Validators.required }),
    salario_base: new FormControl(Number(this.data.empleado.salario_base) || 0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    periodo_pago: new FormControl(this.data.empleado.periodo_pago || 'mensual', { nonNullable: true, validators: Validators.required }),
    salario_integral: new FormControl(Boolean(this.data.empleado.salario_integral), { nonNullable: true }),
    salario_menor_motivo: new FormControl('', { nonNullable: true }),
  });

  save() {
    if (this.form.invalid || this.saving || !this.data.empleado.fecha_retiro) return;
    const value = this.form.getRawValue();
    const date = value.fecha_ingreso!;
    const ingreso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (ingreso <= this.data.empleado.fecha_retiro.slice(0, 10)) {
      this.snack.open('El nuevo ingreso debe ser posterior al último retiro', 'Cerrar', { duration: 4000 });
      return;
    }
    this.saving = true;
    this.ref.disableClose = true;
    this.api.recontratarEmpleado(this.data.empleado.id, {
      fecha_ingreso: ingreso,
      tipo_contrato: value.tipo_contrato,
      salario_base: Number(value.salario_base),
      periodo_pago: value.periodo_pago,
      salario_integral: value.salario_integral,
      salario_menor_motivo: value.salario_menor_motivo.trim() || undefined,
    }).subscribe({
      next: () => {
        this.snack.open('Empleado recontratado; período anterior conservado', 'OK', { duration: 3500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.ref.disableClose = false;
        this.snack.open(error?.error?.error || 'No se pudo registrar la recontratación', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
