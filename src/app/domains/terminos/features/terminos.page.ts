import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from '@/app/core/authentication/authentication.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';

/**
 * Pantalla bloqueante de aceptación de términos y condiciones.
 * Se muestra tras el login a cualquier usuario que no haya aceptado la
 * versión vigente. Sin aceptar no recibe notificaciones por ningún canal
 * (correo, WhatsApp, etc.) y no puede usar la plataforma.
 */
@Component({
  selector: 'terminos-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIcon,
    MatProgressSpinner,
  ],
  templateUrl: './terminos.page.html',
})
export default class TerminosPage {
  private auth = inject(AuthenticationService);
  private creds = inject(CredentialsService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);
  version = signal('');
  texto = signal('');
  acepta = false;
  usuario = this.creds.user;

  constructor() {
    this.auth.terminos().subscribe({
      next: (t) => {
        this.version.set(t.version);
        this.texto.set(t.texto);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  aceptar() {
    if (!this.acepta || this.saving()) return;
    this.saving.set(true);
    this.auth.aceptarTerminos(this.version()).subscribe({
      next: () => {
        this.snack.open('Términos aceptados. Bienvenido.', 'OK', { duration: 3000 });
        this.router.navigate(['/admin']);
      },
      error: (e) => {
        this.saving.set(false);
        this.snack.open(e?.error?.error || 'No se pudo registrar la aceptación', 'Cerrar', { duration: 4000 });
      },
    });
  }

  salir() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/sign-in']));
  }
}
