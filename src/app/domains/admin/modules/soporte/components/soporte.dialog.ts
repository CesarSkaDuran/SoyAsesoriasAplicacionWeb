import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SOPORTE_TIPOS } from '@/app/models/negocio.model';

@Component({
  selector: 'soporte-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
  ],
  template: `
    <dialog-header title="Nuevo ticket de soporte" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid grid-cols-1 pt-2"
      >
        <mat-form-field appearance="outline">
          <mat-label>Tipo de servicio</mat-label>
          <mat-select formControlName="tipo_servicio">
            @for (t of tipos; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Asunto</mat-label>
          <input matInput formControlName="asunto" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mensaje</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="mensaje"
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
        Enviar
      </button>
    </mat-dialog-actions>
  `,
})
export class SoporteDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private ref = inject(MatDialogRef<SoporteDialog>);
  private snack = inject(MatSnackBar);

  tipos = SOPORTE_TIPOS;
  saving = false;

  form = this.fb.group({
    tipo_servicio: ['', Validators.required],
    asunto: [''],
    mensaje: [''],
  });

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    this.api
      .createSoporte({
        tipo_solicitud: this.creds.isAdmin() ? 'empresa' : 'empresa',
        tipo_servicio: v.tipo_servicio ?? undefined,
        asunto: v.asunto || v.tipo_servicio || undefined,
        mensaje: v.mensaje || undefined,
      })
      .subscribe({
        next: () => {
          this.snack.open('Ticket creado', 'OK', { duration: 2500 });
          this.ref.close(true);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo crear', 'Cerrar');
        },
      });
  }
}
