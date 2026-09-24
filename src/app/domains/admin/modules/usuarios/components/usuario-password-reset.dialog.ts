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
import { Usuario } from '@/app/models/negocio.model';

@Component({
  selector: 'usuario-password-reset-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DialogHeader,
  ],
  templateUrl: './usuario-password-reset.dialog.html',
})
export class UsuarioPasswordResetDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<UsuarioPasswordResetDialog>);
  data = inject<{ usuario: Usuario }>(MAT_DIALOG_DATA);

  saving = signal(false);
  form = this.fb.group({
    new_password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirm_password: ['', Validators.required],
  });

  passwordsMatch() {
    return this.form.controls.new_password.value === this.form.controls.confirm_password.value;
  }

  save() {
    if (this.form.invalid || !this.passwordsMatch()) return;
    this.saving.set(true);
    this.api
      .resetUsuarioPassword(this.data.usuario.id, this.form.controls.new_password.value!)
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.saving.set(false);
          this.snack.open(
            err?.error?.error || 'No se pudo restablecer la contraseña',
            'Cerrar',
            { duration: 4000 }
          );
        },
      });
  }
}
