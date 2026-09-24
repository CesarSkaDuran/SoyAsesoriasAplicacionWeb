import { Component, inject, signal } from '@angular/core';
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
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { CatalogoItem, Empleado } from '@/app/models/empleado.model';

@Component({
  selector: 'incapacidad-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
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

  data = inject<{ empleado: Empleado }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { empleado: Empleado };
  eps = signal<CatalogoItem[]>([]);
  saving = false;

  form = this.fb.group({
    eps_id: [this.data.empleado.eps_id ?? null as number | null],
    fecha_inicio: ['', Validators.required],
    fecha_fin: [''],
    tipo: ['comun'],
    dias: [null as number | null],
    valor: [null as number | null],
  });

  constructor() {
    this.api.catalogos().subscribe((c) => this.eps.set(c['eps'] ?? []));
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const fmt = (d: string | null) =>
      d ? new Date(d).toISOString().slice(0, 10) : undefined;

    this.api
      .addIncapacidad(this.data.empleado.id, {
        eps_id: v.eps_id ?? undefined,
        fecha_inicio: fmt(v.fecha_inicio)!,
        fecha_fin: fmt(v.fecha_fin),
        tipo: v.tipo ?? 'comun',
        dias: v.dias ?? undefined,
        valor: v.valor ?? undefined,
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
