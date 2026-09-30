import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService, CorreoConfigPayload } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';

@Component({
  selector: 'correo-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    RouterLink,
    PageHeader,
  ],
  templateUrl: './correo.page.html',
})
export default class CorreoPage implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);
  probando = signal(false);
  passwordConfigurada = signal(false);
  origen = signal<'bd' | 'env'>('env');
  pruebaResultado = signal<{ ok: boolean; error?: string } | null>(null);

  form = new FormGroup({
    host: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    port: new FormControl(465, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(65535)],
    }),
    secure: new FormControl(true, { nonNullable: true }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true }),
    remitente: new FormControl('', { nonNullable: true }),
    correos_admin: new FormControl('', { nonNullable: true }),
  });

  ngOnInit() {
    this.api.correoConfig().subscribe({
      next: (cfg) => {
        this.form.patchValue({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          username: cfg.username,
          remitente: cfg.remitente ?? '',
          correos_admin: cfg.correos_admin ?? '',
        });
        this.passwordConfigurada.set(cfg.password_configurada);
        this.origen.set(cfg.origen);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private payload(): CorreoConfigPayload {
    const v = this.form.getRawValue();
    return {
      host: v.host.trim(),
      port: Number(v.port),
      secure: v.secure,
      username: v.username.trim(),
      password: v.password || undefined,
      remitente: v.remitente.trim() || undefined,
      correos_admin: v.correos_admin.trim(),
    };
  }

  probar() {
    if (this.form.invalid || this.probando()) return;
    this.probando.set(true);
    this.pruebaResultado.set(null);
    this.api.probarCorreoConfig(this.payload()).subscribe({
      next: () => {
        this.probando.set(false);
        this.pruebaResultado.set({ ok: true });
      },
      error: (e) => {
        this.probando.set(false);
        this.pruebaResultado.set({
          ok: false,
          error: e?.error?.error || 'No se pudo conectar al servidor SMTP',
        });
      },
    });
  }

  guardar() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.api.guardarCorreoConfig(this.payload()).subscribe({
      next: () => {
        this.saving.set(false);
        this.origen.set('bd');
        this.passwordConfigurada.set(true);
        this.form.patchValue({ password: '' });
        this.snack.open('Configuración de correo guardada', 'OK', { duration: 3000 });
      },
      error: (e) => {
        this.saving.set(false);
        this.snack.open(e?.error?.error || 'No se pudo guardar', 'Cerrar', { duration: 4000 });
      },
    });
  }
}
