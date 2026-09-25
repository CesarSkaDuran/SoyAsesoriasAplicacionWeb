import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DialogHeader } from '@/app/core/ui/dialog-header';

export interface EmpleadoBloqueado {
  id: number;
  nombre: string;
  documento: string;
  salario: number;
}

interface DialogData {
  empleados: EmpleadoBloqueado[];
  motivos?: Record<number, string>;
}

// Modal inline del bloqueo SMMLV: lista empleados bajo el mínimo y captura
// el motivo de cada uno. Devuelve { [empleadoId]: motivo } para reintentar.
@Component({
  selector: 'salario-menor-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CurrencyPipe,
    DialogHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salario-menor.dialog.html',
})
export class SalarioMenorDialog {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<SalarioMenorDialog>);

  data = inject<DialogData>(MAT_DIALOG_DATA) ?? { empleados: [] };

  motivos = this.fb.array(
    this.data.empleados.map((e) =>
      this.fb.control(this.data.motivos?.[e.id] ?? '')
    )
  );

  get todosConMotivo(): boolean {
    return this.motivos.controls.every((c) => String(c.value || '').trim());
  }

  apply() {
    if (!this.todosConMotivo) return;
    const result: Record<number, string> = {};
    this.data.empleados.forEach((e, i) => {
      result[e.id] = String(this.motivos.at(i).value || '').trim();
    });
    this.ref.close(result);
  }
}
