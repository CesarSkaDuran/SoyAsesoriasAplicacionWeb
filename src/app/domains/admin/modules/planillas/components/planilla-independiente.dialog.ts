import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Planilla } from '@/app/models/negocio.model';

@Component({
  selector: 'planilla-independiente-dialog',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DialogHeader,
  ],
  templateUrl: './planilla-independiente.dialog.html',
})
export class PlanillaIndependienteDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<PlanillaIndependienteDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{
    ingresos: { ingreso_mensual: number | string | null; ingreso_adicional: number | string | null };
    planilla?: Planilla;
  }>(MAT_DIALOG_DATA);
  saving = false;
  isEdit = !!this.data.planilla;
  private ingresoMensualInicial = this.data.planilla?.ingreso_mensual ?? this.data.ingresos.ingreso_mensual;
  private fechaActual = new Date();
  private periodoActual = `${this.fechaActual.getFullYear()}-${String(this.fechaActual.getMonth() + 1).padStart(2, '0')}`;

  form = this.fb.group({
    periodo: [this.data.planilla?.periodo || this.periodoActual, Validators.required],
    ingreso_mensual: [this.ingresoMensualInicial == null ? null : Number(this.ingresoMensualInicial), [Validators.required, Validators.min(0)]],
    ingreso_adicional: [Number(this.data.planilla?.ingreso_adicional ?? this.data.ingresos.ingreso_adicional) || 0, [Validators.required, Validators.min(0)]],
  });

  get ingresoTotal(): number {
    return (Number(this.form.controls.ingreso_mensual.value) || 0)
      + (Number(this.form.controls.ingreso_adicional.value) || 0);
  }

  save() {
    if (this.form.invalid || this.ingresoTotal <= 0 || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    const payload = {
      periodo: value.periodo!,
      ingreso_mensual: Number(value.ingreso_mensual),
      ingreso_adicional: Number(value.ingreso_adicional) || 0,
    };
    const request = this.isEdit
      ? this.api.updatePlanilla(this.data.planilla!.id, payload)
      : this.api.createPlanilla(payload);
    request.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Diligenciamiento actualizado' : 'Diligenciamiento enviado a SoyAsesorías', 'OK', { duration: 3000 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.error || 'No se pudo diligenciar la planilla', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
