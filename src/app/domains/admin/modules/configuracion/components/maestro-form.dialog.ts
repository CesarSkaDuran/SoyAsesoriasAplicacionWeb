import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { MaestroField, MaestroMeta } from '@/app/models/empleado.model';

export interface MaestroDialogData {
  meta: MaestroMeta;
  item?: Record<string, any>;
  /** opciones precargadas para los campos select: source -> items */
  options: Record<string, { id: number; nombre?: string; razon_social?: string }[]>;
}

@Component({
  selector: 'maestro-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header
      [title]="(isEdit ? 'Editar ' : 'Nuevo ') + singular()"
    />

    <mat-dialog-content class="mat-typography !px-5 !py-5 sm:!px-6">
      <div class="mb-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-medium text-white">
          <mat-icon [svgIcon]="data.meta.icon" class="!size-5" />
        </span>
        <div>
          <div class="font-semibold text-slate-800">{{ data.meta.label }}</div>
          <div class="text-xs text-slate-500">
            {{ isEdit ? 'Actualiza la información del registro seleccionado.' : 'Completa la información para agregarlo al listado.' }}
          </div>
        </div>
      </div>

      <form
        [formGroup]="form"
        class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2"
      >
        @for (field of data.meta.fields; track field.key) {
          @switch (field.type) {
            @case ('boolean') {
              <div class="flex min-h-14 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                <mat-slide-toggle [formControlName]="field.key">
                  <span class="font-medium text-slate-700">{{ field.label }}</span>
                </mat-slide-toggle>
              </div>
            }
            @case ('textarea') {
              <mat-form-field class="sm:col-span-2" appearance="outline">
                <mat-label>{{ field.label }}</mat-label>
                <textarea
                  matInput
                  rows="3"
                  [formControlName]="field.key"
                ></textarea>
              </mat-form-field>
            }
            @case ('select') {
              <searchable-select
                [label]="field.label"
                [items]="optionsFor(field)"
                displayKey="label"
                valueKey="value"
                [nullLabel]="field.required ? null : 'Sin seleccionar'"
                [required]="!!field.required"
                [formControlName]="field.key"
              />
            }
            @case ('number') {
              <mat-form-field class="w-full" appearance="outline">
                <mat-label>{{ field.label }}</mat-label>
                <input
                  matInput
                  type="number"
                  [formControlName]="field.key"
                />
                @if (form.get(field.key)?.hasError('required')) {
                  <mat-error>Este campo es obligatorio</mat-error>
                }
              </mat-form-field>
            }
            @default {
              <mat-form-field class="w-full" appearance="outline">
                <mat-label>{{ field.label }}</mat-label>
                <input matInput [formControlName]="field.key" />
                @if (form.get(field.key)?.hasError('required')) {
                  <mat-error>Este campo es obligatorio</mat-error>
                }
              </mat-form-field>
            }
          }
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!gap-2 !border-t !border-slate-100 !bg-slate-50/70 !px-6 !py-4">
      <button matButton="text" mat-dialog-close>Cancelar</button>
      <button
        matButton="filled"
        class="!px-5"
        [disabled]="form.invalid || saving"
        (click)="save()"
      >
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear registro' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class MaestroFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<MaestroFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<MaestroDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {
    meta: { key: '', label: '', icon: '', fields: [], total: 0 },
    options: {},
  };

  isEdit = !!this.data.item?.['id'];
  saving = false;

  form = this.buildForm();

  private buildForm() {
    const group: Record<string, any> = {};
    for (const f of this.data.meta.fields) {
      const existing = this.data.item?.[f.key];
      const value =
        existing !== undefined && existing !== null
          ? f.type === 'number' || f.type === 'select'
            ? Number(existing)
            : existing
          : f.default ?? (f.type === 'boolean' ? true : null);
      group[f.key] = [value, f.required ? Validators.required : []];
    }
    return this.fb.group(group);
  }

  singular() {
    return (
      this.data.meta.singular || this.data.meta.label.replace(/s$/, '')
    ).toLowerCase();
  }

  optionsFor(field: MaestroField): { value: any; label: string }[] {
    if (field.options) return field.options;
    if (!field.source) return [];
    const items = this.data.options[field.source] ?? [];
    return items.map((i) => ({
      value: i.id,
      label: i.nombre ?? i.razon_social ?? `#${i.id}`,
    }));
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.getRawValue();

    const req = this.isEdit
      ? this.api.updateMaestroItem(
          this.data.meta.key,
          this.data.item!['id'],
          payload
        )
      : this.api.createMaestroItem(this.data.meta.key, payload);

    req.subscribe({
      next: () => {
        this.snack.open('Registro guardado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snack.open(
          error?.error?.message || 'No se pudo guardar',
          'Cerrar'
        );
      },
    });
  }
}
