import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthenticationService } from '@/app/core/authentication/authentication.service';

@Component({
  selector: 'auth-sign-in',
  templateUrl: './sign-in.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FormField,
  ],
})
export default class AuthSignIn {
  // Dependencies
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthenticationService);

  // State
  protected signInFormModel = signal({
    email: '',
    password: '',
  });
  protected signInForm = form(this.signInFormModel, (form) => {
    required(form.email, { message: 'Debes ingresar un correo' });
    email(form.email, { message: 'Debes ingresar un correo válido' });

    required(form.password, { message: 'Debes ingresar una contraseña' });
  });

  signIn(event: Event) {
    event.preventDefault();

    submit(this.signInForm, async () => {
      const { email, password } = this.signInFormModel();
      this.authService.login({ email, password }).subscribe({
        next: () => {
          const redirect =
            this.route.snapshot.queryParamMap.get('redirect') || '/admin';
          this.router.navigateByUrl(redirect);
        },
        error: () =>
          this.snackBar.open('Usuario o contraseña incorrectos', 'Cerrar', {
            duration: 3000,
          }),
      });
    });
  }
}
