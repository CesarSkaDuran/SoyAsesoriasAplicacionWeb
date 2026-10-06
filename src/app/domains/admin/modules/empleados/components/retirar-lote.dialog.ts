import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';

@Component({
  selector: 'retirar-lote-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    DialogHeader,
  ],
  templateUrl: './retirar-lote.dialog.html',
})
export class RetirarLoteDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<RetirarLoteDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empleados: { id: number; nombre: string }[] }>(
    MAT_DIALOG_DATA,
    { optional: true }
  ) ?? { empleados: [] as { id: number; nombre: string }[] };
  saving = false;

  form = this.fb.group({
    fecha_retiro: [new Date()],
  });

  retirar() {
    if (this.saving || !this.data.empleados.length) return;
    this.saving = true;
    const fecha = this.form.value.fecha_retiro;
    const fechaIso = fecha
      ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
      : undefined;

    this.api
      .retirarEmpleados(
        this.data.empleados.map((e) => e.id),
        fechaIso
      )
      .subscribe({
        next: (res) => {
          this.snack.open(res.message, 'OK', { duration: 3000 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo retirar los empleados', 'Cerrar');
        },
      });
  }
}
