import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Solicitud } from '@/app/models/negocio.model';

@Component({
  selector: 'solicitud-entrega-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    DialogHeader,
  ],
  templateUrl: './solicitud-entrega.dialog.html',
})
export class SolicitudEntregaDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private ref = inject(MatDialogRef<SolicitudEntregaDialog>);
  data = inject<Solicitud>(MAT_DIALOG_DATA);

  saving = signal(false);

  form = this.fb.group({
    fecha_entrega: [
      this.data.fecha_entrega
        ? new Date(`${this.data.fecha_entrega}T00:00:00`)
        : null as Date | null,
    ],
    observaciones: [this.data.observaciones ?? ''],
  });

  save() {
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.api
      .updateSolicitud(this.data.id, {
        fecha_entrega: v.fecha_entrega ? this.fmt(v.fecha_entrega) : null,
        observaciones: v.observaciones || null,
      })
      .subscribe({
        next: () => {
          this.snack.open('Solicitud actualizada', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snack.open(
            err?.error?.error || 'No se pudo actualizar',
            'Cerrar',
            { duration: 3500 }
          );
        },
      });
  }

  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
