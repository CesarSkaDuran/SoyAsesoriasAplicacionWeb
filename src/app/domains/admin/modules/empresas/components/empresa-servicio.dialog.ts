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
import { ServicioCatalogo } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'empresa-servicio-dialog',
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
  templateUrl: './empresa-servicio.dialog.html',
})
export class EmpresaServicioDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<EmpresaServicioDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empresa: Empresa }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { empresa: Empresa };
  catalogo = signal<ServicioCatalogo[]>([]);
  saving = false;

  form = this.fb.group({
    servicio_id: [null as number | null, Validators.required],
    valor: [null as number | null],
    fecha_inicio: [null as Date | null],
  });

  constructor() {
    this.api.serviciosCatalogo().subscribe((r) => this.catalogo.set(r.data));
  }

  onServicio(id: number) {
    const s = this.catalogo().find((c) => c.id === id);
    if (s?.valor) this.form.patchValue({ valor: Number(s.valor) });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    this.api
      .addEmpresaServicio(this.data.empresa.id, {
        servicio_id: v.servicio_id!,
        valor: v.valor ?? undefined,
        fecha_inicio: v.fecha_inicio
          ? v.fecha_inicio.toISOString().slice(0, 10)
          : undefined,
      })
      .subscribe({
        next: () => {
          this.snack.open('Servicio asignado', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo asignar', 'Cerrar');
        },
      });
  }
}
