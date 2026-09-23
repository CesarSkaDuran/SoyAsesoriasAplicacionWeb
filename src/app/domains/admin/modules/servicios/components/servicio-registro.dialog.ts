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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import {
  SERVICIO_CATEGORIAS,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'servicio-registro-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header
      [title]="isEdit ? 'Editar registro de servicio' : 'Solicitar servicio'"
    />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid grid-cols-2 gap-x-4 pt-2"
      >
        @if (isAdmin) {
          <searchable-select
            class="col-span-2"
            label="Empresa"
            [items]="data.empresas || []"
            displayKey="razon_social"
            formControlName="empresa_id"
          />
        }

        <searchable-select
          class="col-span-2"
          label="Servicio"
          [items]="categorias"
          displayKey="label"
          valueKey="nombre"
          formControlName="nombre"
        />

        <mat-form-field appearance="outline">
          <mat-label>Detalle / paquete</mat-label>
          <input matInput formControlName="paquete" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input
            matInput
            type="number"
            formControlName="cantidad"
          />
        </mat-form-field>

        @if (isAdmin) {
          <mat-form-field appearance="outline">
            <mat-label>Valor</mat-label>
            <input
              matInput
              type="number"
              formControlName="valor"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>N° empleados</mat-label>
            <input
              matInput
              type="number"
              formControlName="numero_empleados"
            />
          </mat-form-field>
        }

        <mat-form-field class="col-span-2" appearance="outline">
          <mat-label>Observaciones</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="obs"
          ></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        matButton="text"
        mat-dialog-close
      >
        Cancelar
      </button>
      <button
        matButton="filled"
        [disabled]="form.invalid || saving"
        (click)="save()"
      >
        {{ isEdit ? 'Guardar' : 'Solicitar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ServicioRegistroDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private ref = inject(MatDialogRef<ServicioRegistroDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{
    registro?: ServicioRegistro;
    categoria?: string;
    empresas?: Empresa[];
  }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as {
    registro?: ServicioRegistro;
    categoria?: string;
    empresas?: Empresa[];
  };

  categorias = SERVICIO_CATEGORIAS;
  isEdit = !!this.data.registro;
  isAdmin = this.creds.isAdmin();
  saving = false;

  form = this.fb.group({
    empresa_id: [this.data.registro?.empresa_id ?? null as number | null],
    nombre: [this.data.registro?.nombre || this.data.categoria || '', Validators.required],
    paquete: [this.data.registro?.paquete || ''],
    cantidad: [this.data.registro?.cantidad ?? 1],
    valor: [this.data.registro?.valor ? Number(this.data.registro.valor) : null as number | null],
    numero_empleados: [this.data.registro?.numero_empleados ?? 0],
    obs: [this.data.registro?.obs || ''],
  });

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<ServicioRegistro> = {
      nombre: v.nombre ?? undefined,
      paquete: v.paquete || undefined,
      cantidad: v.cantidad ?? 1,
      obs: v.obs || undefined,
    };
    if (this.isAdmin) {
      payload.empresa_id = v.empresa_id ?? undefined;
      payload.valor = v.valor ?? undefined;
      payload.numero_empleados = v.numero_empleados ?? undefined;
    }

    const req = this.isEdit
      ? this.api.updateServicioRegistro(this.data.registro!.id, payload)
      : this.api.createServicioRegistro(payload);

    req.subscribe({
      next: () => {
        this.snack.open(
          this.isEdit ? 'Registro actualizado' : 'Servicio solicitado',
          'OK',
          { duration: 2500 }
        );
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.open('No se pudo guardar', 'Cerrar');
      },
    });
  }
}
