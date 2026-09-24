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
  templateUrl: './maestro-form.dialog.html',
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
