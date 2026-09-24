import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Usuario } from '@/app/models/negocio.model';
import { UsuarioFormDialog } from '../components/usuario-form.dialog';
import { UsuarioPasswordResetDialog } from '../components/usuario-password-reset.dialog';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  empresa: 'Empresa',
  independiente: 'Independiente',
};

@Component({
  selector: 'usuarios-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    DatePipe,
    PageHeader,
  ],
  templateUrl: './usuarios.page.html',
})
export default class UsuariosPage {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  usuarios = signal<Usuario[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);

  searchControl = new FormControl('');
  roleControl = new FormControl<string | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de usuarios
  columns = ['id', 'company', 'value', 'date', 'concept', 'status', 'nit', 'options'];

  constructor() {
    this.roleControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .usuarios({
        search: this.searchControl.value || undefined,
        role: this.roleControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.usuarios.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  roleLabel = (r: string) => ROLE_LABEL[r] || r;

  toggleActivo(u: Usuario, activo: boolean) {
    this.api.updateUsuario(u.id, { is_active: activo }).subscribe(() => {
      this.snack.open(activo ? 'Usuario activado' : 'Usuario desactivado', 'OK', {
        duration: 2500,
      });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(UsuarioFormDialog, { width: '640px', data: {} })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(u: Usuario) {
    this.dialog
      .open(UsuarioFormDialog, { width: '640px', data: { usuario: u } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openPasswordReset(u: Usuario) {
    this.dialog
      .open(UsuarioPasswordResetDialog, {
        width: '440px',
        maxWidth: '95vw',
        data: { usuario: u },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.snack.open('Contraseña restablecida. Comunica la nueva clave al cliente por un canal seguro.', 'Cerrar', {
            duration: 5000,
          });
        }
      });
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
