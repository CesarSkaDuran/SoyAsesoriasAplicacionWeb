import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { ConceptoNomina } from '@/app/models/empleado.model';

export interface ConceptoFormData {
  concepto?: ConceptoNomina;
}

@Component({
  selector: 'concepto-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    DialogHeader,
  ],
  templateUrl: './concepto-form.dialog.html',
})
export class ConceptoFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ConceptoFormDialog>);
  private data = inject<ConceptoFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected editing = !!this.data.concepto;
  protected saving = signal(false);

  protected form = this.fb.group({
    nombre: [this.data.concepto?.nombre ?? '', Validators.required],
    constitutivo_salario: [this.data.concepto?.constitutivo_salario ? '1' : '0'],
    tratamiento_fiscal: [this.data.concepto?.tratamiento_fiscal ?? 'gravable'],
    limite_incr_uvt: [this.data.concepto?.limite_incr_uvt ?? null],
    condicion_salario_uvt: [this.data.concepto?.condicion_salario_uvt ?? null],
    fuente_normativa: [this.data.concepto?.fuente_normativa ?? ''],
    activo_pendiente_verificacion: [!!this.data.concepto?.activo_pendiente_verificacion],
    activo: [this.data.concepto?.activo === undefined ? true : !!this.data.concepto?.activo],
  });

  get esIncr(): boolean {
    return this.form.value.tratamiento_fiscal === 'incr';
  }

  get fuenteRequerida(): boolean {
    return this.esIncr && !String(this.form.value.fuente_normativa || '').trim();
  }

  save() {
    if (this.form.invalid) return;
    if (this.fuenteRequerida) {
      this.snack.open('Un concepto INCR exige fuente normativa', 'Cerrar', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    const v = this.form.value;
    const payload: Partial<ConceptoNomina> = {
      nombre: v.nombre ?? undefined,
      constitutivo_salario: v.constitutivo_salario === '1',
      tratamiento_fiscal: v.tratamiento_fiscal === 'incr' ? 'incr' : 'gravable',
      limite_incr_uvt: Number(v.limite_incr_uvt) > 0 ? Number(v.limite_incr_uvt) : null,
      condicion_salario_uvt: Number(v.condicion_salario_uvt) > 0 ? Number(v.condicion_salario_uvt) : null,
      fuente_normativa: v.fuente_normativa || null,
      activo_pendiente_verificacion: !!v.activo_pendiente_verificacion,
      activo: !!v.activo,
    };
    const request = this.editing
      ? this.api.updateConceptoNomina(this.data.concepto!.id, payload)
      : this.api.createConceptoNomina(payload);
    request.subscribe({
      next: () => {
        this.snack.open(this.editing ? 'Concepto actualizado' : 'Concepto creado', 'Cerrar', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.error ?? 'Error al guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
