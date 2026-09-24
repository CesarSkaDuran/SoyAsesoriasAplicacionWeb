import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Embudo, Etapa } from '@/app/models/negocio.model';

interface DialogData {
  embudo?: Embudo;
  etapas?: Etapa[];
}

@Component({
  selector: 'etapa-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckbox,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    DialogHeader,
  ],
  templateUrl: './etapa-form.dialog.html',
})
export class EtapaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DialogData;

  etapas = signal<Etapa[]>([...(this.data.etapas ?? [])]);
  editingId = signal<number | null>(null);
  changed = signal(false);
  saving = false;

  createForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    es_cierre: [false],
    es_perdido: [false],
  });

  editForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    es_cierre: [false],
    es_perdido: [false],
  });

  startEdit(e: Etapa) {
    this.editingId.set(e.id);
    this.editForm.setValue({
      nombre: e.nombre,
      descripcion: e.descripcion ?? '',
      es_cierre: !!e.es_cierre,
      es_perdido: !!e.es_perdido,
    });
  }

  create() {
    if (this.createForm.invalid || !this.data.embudo) return;
    this.saving = true;
    const v = this.createForm.getRawValue();
    this.api
      .createEtapa(this.data.embudo.id, {
        nombre: v.nombre!,
        descripcion: v.descripcion || null,
        es_cierre: !!v.es_cierre,
        es_perdido: !!v.es_perdido,
      })
      .subscribe({
        next: (r) => {
          this.etapas.update((list) => [
            ...list,
            {
              id: r.id,
              embudo_id: this.data.embudo!.id,
              slug: '',
              nombre: v.nombre!,
              descripcion: v.descripcion || null,
              posicion: list.length + 1,
              es_cierre: !!v.es_cierre,
              es_perdido: !!v.es_perdido,
              total: 0,
            },
          ]);
          this.createForm.reset();
          this.saving = false;
          this.changed.set(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo crear la etapa', 'Cerrar', { duration: 3000 });
        },
      });
  }

  saveEdit(e: Etapa) {
    if (this.editForm.invalid) return;
    const v = this.editForm.getRawValue();
    this.api
      .updateEtapa(e.id, {
        nombre: v.nombre!,
        descripcion: v.descripcion || null,
        es_cierre: !!v.es_cierre,
        es_perdido: !!v.es_perdido,
      })
      .subscribe({
        next: () => {
          this.etapas.update((list) =>
            list.map((x) =>
              x.id === e.id
                ? { ...x, nombre: v.nombre!, descripcion: v.descripcion || null, es_cierre: !!v.es_cierre, es_perdido: !!v.es_perdido }
                : x
            )
          );
          this.editingId.set(null);
          this.changed.set(true);
          this.snack.open('Etapa actualizada', 'OK', { duration: 2000 });
        },
        error: () => this.snack.open('No se pudo actualizar', 'Cerrar', { duration: 3000 }),
      });
  }

  remove(e: Etapa) {
    if (!confirm(`¿Eliminar la etapa "${e.nombre}"?`)) return;
    this.api.deleteEtapa(e.id).subscribe({
      next: () => {
        this.etapas.update((list) => list.filter((x) => x.id !== e.id));
        this.changed.set(true);
      },
      error: (err) =>
        this.snack.open(err?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3500 }),
    });
  }
}
