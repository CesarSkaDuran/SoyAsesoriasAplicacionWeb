import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from '@/app/core/authentication/authentication.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';

@Component({
  selector: 'change-password-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    DialogHeader,
  ],
  templateUrl: './change-password.dialog.html',
})
export class ChangePasswordDialog {
  private fb = inject(FormBuilder);
  private auth = inject(AuthenticationService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialog>);

  protected saving = signal(false);
  protected form = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirm_password: ['', Validators.required],
  });

  protected passwordsMatch = () =>
    this.form.controls.new_password.value === this.form.controls.confirm_password.value;

  save() {
    if (this.form.invalid || !this.passwordsMatch()) return;
    this.saving.set(true);
    this.auth
      .changePassword({
        current_password: this.form.controls.current_password.value!,
        new_password: this.form.controls.new_password.value!,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Contraseña actualizada', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.error || 'No se pudo cambiar la contraseña',
            'Cerrar',
            { duration: 4000 }
          );
        },
      });
  }
}
