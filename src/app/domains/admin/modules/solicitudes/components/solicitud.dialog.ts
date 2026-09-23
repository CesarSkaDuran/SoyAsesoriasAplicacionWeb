import { Component, inject, signal } from '@angular/core';
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
import { ServicioCatalogo } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'solicitud-dialog',
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
    <dialog-header title="Nueva solicitud" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid grid-cols-1 gap-x-4 pt-2"
      >
        @if (isAdmin) {
          <searchable-select
            label="Empresa"
            [items]="data.empresas || []"
            displayKey="razon_social"
            formControlName="empresa_id"
          />
        }

        <searchable-select
          label="Servicio"
          [items]="servicios()"
          displayKey="nombre"
          formControlName="servicio_id"
        />

        <mat-form-field appearance="outline">
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="descripcion"
            placeholder="Describe lo que necesitas..."
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
        Enviar solicitud
      </button>
    </mat-dialog-actions>
  `,
})
export class SolicitudDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private ref = inject(MatDialogRef<SolicitudDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ empresas?: Empresa[] }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { empresas?: Empresa[] };

  isAdmin = this.creds.isAdmin();
  saving = false;
  servicios = signal<ServicioCatalogo[]>([]);

  form = this.fb.group({
    empresa_id: [null as number | null],
    servicio_id: [null as number | null],
    descripcion: ['', Validators.required],
  });

  constructor() {
    this.api.serviciosCatalogo().subscribe((r) => this.servicios.set(r.data));
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    this.api
      .createSolicitud({
        empresa_id: v.empresa_id ?? undefined,
        servicio_id: v.servicio_id ?? undefined,
        descripcion: v.descripcion ?? '',
      })
      .subscribe({
        next: () => {
          this.snack.open('Solicitud enviada', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo enviar', 'Cerrar');
        },
      });
  }
}
