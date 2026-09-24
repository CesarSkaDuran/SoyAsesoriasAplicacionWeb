import { Component, inject } from '@angular/core';
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
import { Planilla } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'planilla-dialog',
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
  templateUrl: './planilla.dialog.html',
})
export class PlanillaDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<PlanillaDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ planilla?: Planilla; empresas?: Empresa[] }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { planilla?: Planilla; empresas?: Empresa[] };

  isEdit = !!this.data.planilla;
  saving = false;

  form = this.fb.group({
    empresa_id: [this.data.planilla?.empresa_id ?? (null as number | null), Validators.required],
    numero_planilla: [this.data.planilla?.numero_planilla || ''],
    periodo: [this.data.planilla?.periodo || ''],
    valor_total: [this.data.planilla?.valor_total ? Number(this.data.planilla.valor_total) : 0],
    fecha_pago: [this.data.planilla?.fecha_pago || ''],
  });

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<Planilla> = {
      empresa_id: v.empresa_id ?? undefined,
      numero_planilla: v.numero_planilla || undefined,
      periodo: v.periodo || undefined,
      valor_total: v.valor_total ?? 0,
      fecha_pago: v.fecha_pago
        ? new Date(v.fecha_pago).toISOString().slice(0, 10)
        : undefined,
    };

    const req = this.isEdit
      ? this.api.updatePlanilla(this.data.planilla!.id, payload)
      : this.api.createPlanilla(payload);

    req.subscribe({
      next: () => {
        this.snack.open('Planilla guardada', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.open('No se pudo guardar', 'Cerrar');
      },
    });
  }
}
