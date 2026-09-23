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
  template: `
    <dialog-header [title]="'Etapas — ' + (data.embudo?.nombre || '')" />

    <mat-dialog-content class="mat-typography">
      <!-- Lista de etapas -->
      <div class="mb-4 space-y-2 pt-2">
        @for (e of etapas(); track e.id; let i = $index) {
          <div class="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
            <span class="w-6 text-center text-sm font-bold text-neutral-400">{{ i + 1 }}</span>
            <div class="flex-1">
              <div class="text-sm font-medium">
                {{ e.nombre }}
                @if (e.es_cierre && !e.es_perdido) {
                  <span class="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">cierre</span>
                }
                @if (e.es_perdido) {
                  <span class="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">perdido</span>
                }
              </div>
              <div class="text-xs text-neutral-500">{{ e.descripcion }}</div>
            </div>
            <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
              {{ e.total ?? 0 }} leads
            </span>
            @if (editingId() === e.id) {
              <button matIconButton (click)="editingId.set(null)">
                <mat-icon svgIcon="x" />
              </button>
            } @else {
              <button matIconButton (click)="startEdit(e)">
                <mat-icon svgIcon="pencil" />
              </button>
              <button
                matIconButton
                class="!text-red-500"
                (click)="remove(e)"
              >
                <mat-icon svgIcon="trash" />
              </button>
            }
          </div>

          @if (editingId() === e.id) {
            <form
              [formGroup]="editForm"
              class="grid grid-cols-2 gap-x-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50"
            >
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="nombre" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Descripción</mat-label>
                <input matInput formControlName="descripcion" />
              </mat-form-field>
              <div class="col-span-2 flex items-center justify-between">
                <div class="flex gap-4">
                  <mat-checkbox formControlName="es_cierre">Es cierre (ganado)</mat-checkbox>
                  <mat-checkbox formControlName="es_perdido">Es perdido</mat-checkbox>
                </div>
                <button
                  matButton="tonal"
                  [disabled]="editForm.invalid"
                  (click)="saveEdit(e)"
                >
                  Guardar
                </button>
              </div>
            </form>
          }
        }
      </div>

      <!-- Nueva etapa -->
      <div class="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Nueva etapa
        </div>
        <form
          [formGroup]="createForm"
          class="grid grid-cols-2 gap-x-3"
        >
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nombre *</mat-label>
            <input matInput formControlName="nombre" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="descripcion" />
          </mat-form-field>
          <div class="col-span-2 flex items-center justify-between">
            <div class="flex gap-4">
              <mat-checkbox formControlName="es_cierre">Es cierre</mat-checkbox>
              <mat-checkbox formControlName="es_perdido">Es perdido</mat-checkbox>
            </div>
            <button
              matButton="filled"
              [disabled]="createForm.invalid || saving"
              (click)="create()"
            >
              <mat-icon svgIcon="plus" />
              Agregar
            </button>
          </div>
        </form>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="filled" [mat-dialog-close]="changed()">Cerrar</button>
    </mat-dialog-actions>
  `,
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
