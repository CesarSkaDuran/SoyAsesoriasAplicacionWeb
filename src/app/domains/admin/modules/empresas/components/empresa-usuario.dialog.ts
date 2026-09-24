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
  templateUrl: './empresa-usuario.dialog.html',
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
