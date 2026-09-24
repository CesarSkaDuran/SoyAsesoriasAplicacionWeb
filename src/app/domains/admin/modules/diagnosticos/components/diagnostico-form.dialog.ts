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
import { Diagnostico, Usuario } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

interface DialogData {
  diagnostico?: Diagnostico | null;
  empresas?: Empresa[];
  usuarios?: Usuario[];
}

@Component({
  selector: 'diagnostico-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './diagnostico-form.dialog.html',
})
export class DiagnosticoFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<DiagnosticoFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DialogData;
  diag = this.data.diagnostico ?? null;

  empresas = signal<Empresa[]>(this.data.empresas ?? []);
  usuarios = signal<(Usuario & { nombre_completo: string })[]>(
    (this.data.usuarios ?? []).map((u) => ({ ...u, nombre_completo: `${u.name} ${u.lastname ?? ''}`.trim() }))
  );
  saving = false;

  form = this.fb.group({
    nombre: [this.diag?.nombre ?? '', Validators.required],
    empresa_id: [this.diag?.empresa_id ?? null as number | null, Validators.required],
    responsable_id: [this.diag?.responsable_id ?? null as number | null, Validators.required],
    fecha_inicio: [this.diag?.fecha_inicio ? new Date(this.diag.fecha_inicio) : null as Date | null, Validators.required],
    fecha_fin: [this.diag?.fecha_fin ? new Date(this.diag.fecha_fin) : null as Date | null, Validators.required],
    estado: [this.diag?.estado ?? 'pendiente'],
  });

  constructor() {
    if (!this.empresas().length) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
    }
    if (!this.usuarios().length) {
      this.api.usuarios({}).subscribe((r) =>
        this.usuarios.set(r.data.map((u) => ({ ...u, nombre_completo: `${u.name} ${u.lastname ?? ''}`.trim() })))
      );
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const payload: Partial<Diagnostico> = {
      nombre: v.nombre!,
      empresa_id: v.empresa_id,
      responsable_id: v.responsable_id,
      fecha_inicio: v.fecha_inicio!.toISOString().slice(0, 10),
      fecha_fin: v.fecha_fin!.toISOString().slice(0, 10),
      estado: v.estado as Diagnostico['estado'],
    };

    const req = this.diag
      ? this.api.updateDiagnostico(this.diag.id, payload)
      : this.api.createDiagnostico(payload);

    req.subscribe({
      next: () => {
        this.snack.open(this.diag ? 'Diagnóstico actualizado' : 'Diagnóstico creado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
