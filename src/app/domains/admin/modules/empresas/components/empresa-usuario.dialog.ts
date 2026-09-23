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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Empresa } from '@/app/models/user.model';

export interface EmpresaUsuarioData {
  empresa: Empresa;
}

@Component({
  selector: 'empresa-usuario-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    DialogHeader,
  ],
  template: `
    <dialog-header title="Usuario de acceso" />
    <mat-dialog-content>
      <div class="mb-3 text-sm text-neutral-500">
        Crea el usuario con el que <strong>{{ data.empresa.razon_social }}</strong>
        ingresará al portal.
      </div>
      <form
        [formGroup]="form"
        class="grid grid-cols-1 gap-x-4 sm:grid-cols-2"
      >
        <mat-form-field>
          <mat-label>Nombre *</mat-label>
          <input
            matInput
            formControlName="name"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Apellido</mat-label>
          <input
            matInput
            formControlName="lastname"
          />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Correo electrónico *</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
          />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Contraseña *</mat-label>
          <input
            matInput
            type="password"
            formControlName="password"
          />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button
        matButton
        mat-dialog-close
      >
        Cancelar
      </button>
      <button
        matButton="filled"
        [disabled]="form.invalid || saving()"
        (click)="save()"
      >
        {{ saving() ? 'Creando…' : 'Crear usuario' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class EmpresaUsuarioDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<EmpresaUsuarioDialog>);
  protected data = inject<EmpresaUsuarioData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as EmpresaUsuarioData;

  protected saving = signal(false);

  protected form = this.fb.group({
    name: ['', Validators.required],
    lastname: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    this.api
      .createUser({
        name: this.form.value.name!,
        lastname: this.form.value.lastname || undefined,
        email: this.form.value.email!,
        password: this.form.value.password!,
        role: 'empresa',
        empresa_id: this.data.empresa.id,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Usuario creado', 'Cerrar', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.error ?? 'Error al crear el usuario',
            'Cerrar',
            { duration: 3000 }
          );
        },
      });
  }
}
