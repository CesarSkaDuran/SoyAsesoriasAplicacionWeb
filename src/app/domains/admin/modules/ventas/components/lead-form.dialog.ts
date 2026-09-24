import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import {
  Embudo,
  Etapa,
  Lead,
  LeadHistorial,
  Usuario,
} from '@/app/models/negocio.model';

interface DialogData {
  embudo?: Embudo;
  etapas?: Etapa[];
  etapaId?: number;
  lead?: Lead | null;
  isAdmin?: boolean;
}

@Component({
  selector: 'lead-form-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatIcon,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './lead-form.dialog.html',
})
export class LeadFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<LeadFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DialogData;
  lead = this.data.lead ?? null;

  usuarios = signal<(Usuario & { nombre_completo: string })[]>([]);
  historial = signal<LeadHistorial[]>([]);
  saving = false;

  form = this.fb.group({
    nombre: [this.lead?.nombre ?? '', Validators.required],
    nombre_emprendedor: [this.lead?.nombre_emprendedor ?? ''],
    empresa: [this.lead?.empresa ?? ''],
    etapa_id: [this.lead?.etapa_id ?? this.data.etapaId ?? null as number | null],
    email: [this.lead?.email ?? ''],
    telefono: [this.lead?.telefono ?? ''],
    fuente: [this.lead?.fuente ?? ''],
    campania: [this.lead?.campania ?? ''],
    usuario_asignado_id: [this.lead?.usuario_asignado_id ?? null as number | null],
    notas: [this.lead?.notas ?? ''],
  });

  constructor() {
    this.api.usuarios({}).subscribe((r) =>
      this.usuarios.set(r.data.map((u) => ({ ...u, nombre_completo: `${u.name} ${u.lastname ?? ''}`.trim() })))
    );
    if (this.lead) {
      this.api.ventasLead(this.lead.id).subscribe((r) => this.historial.set(r.historial));
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const payload: Partial<Lead> = {
      ...v,
      embudo_id: this.data.embudo?.id,
    } as Partial<Lead>;

    const req = this.lead
      ? this.api.updateLead(this.lead.id, payload)
      : this.api.createLead(payload);

    req.subscribe({
      next: (r) => {
        // Si cambió la etapa en edición, registrar el movimiento
        if (this.lead && v.etapa_id && v.etapa_id !== this.lead.etapa_id) {
          this.api.moveLead(this.lead.id, v.etapa_id).subscribe();
        }
        this.snack.open(this.lead ? 'Lead actualizado' : 'Lead creado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  convert(tipo: 'empresa' | 'independiente') {
    if (!this.lead) return;
    this.saving = true;
    this.api.convertirLead(this.lead.id, tipo).subscribe({
      next: () => {
        this.snack.open(
          tipo === 'empresa' ? 'Empresa creada y vinculada' : 'Independiente creado y vinculado',
          'OK',
          { duration: 3000 }
        );
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo convertir', 'Cerrar', { duration: 3000 });
      },
    });
  }

  remove() {
    if (!this.lead || !confirm(`¿Eliminar el lead "${this.lead.nombre}"?`)) return;
    this.saving = true;
    this.api.deleteLead(this.lead.id).subscribe({
      next: () => {
        this.snack.open('Lead eliminado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
