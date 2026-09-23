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
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Usuarios"
        [subtitle]="total() + ' usuarios'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Nuevo usuario
        </button>
      </page-header>

      <!-- Filtros como la app vieja -->
      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field
          class="w-64"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-icon svgIcon="search" matIconPrefix />
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Buscar por nombre o email"
          />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Tipo</mat-label>
          <mat-select [formControl]="roleControl">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option value="admin">Administrador</mat-option>
            <mat-option value="empresa">Empresa</mat-option>
            <mat-option value="independiente">Independiente</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Desde</mat-label>
          <input matInput [matDatepicker]="dpDesde" [formControl]="desdeControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpDesde" />
          <mat-datepicker #dpDesde />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Hasta</mat-label>
          <input matInput [matDatepicker]="dpHasta" [formControl]="hastaControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpHasta" />
          <mat-datepicker #dpHasta />
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <mat-spinner diameter="48" />
        </div>
      } @else {
        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table
              mat-table
              [dataSource]="usuarios()"
              class="w-full"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Id</th>
                <td mat-cell *matCellDef="let u">{{ u.id }}</td>
              </ng-container>
              <ng-container matColumnDef="company">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let u">
                  <div class="font-medium">{{ u.name }} {{ u.lastname || '' }}</div>
                  <div class="text-xs text-neutral-500">
                    {{ u.empresa_nombre || u.persona_nombre }}
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="value">
                <th mat-header-cell *matHeaderCellDef>Tipo</th>
                <td mat-cell *matCellDef="let u">{{ roleLabel(u.role) }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let u">
                  {{ u.created_at | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="concept">
                <th mat-header-cell *matHeaderCellDef>Servicio</th>
                <td mat-cell *matCellDef="let u">
                  {{ u.empresa_nombre || u.persona_nombre || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let u">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [class.bg-green-500]="!!u.is_active"
                    [class.bg-red-500]="!u.is_active"
                  >
                    {{ u.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let u">{{ u.email }}</td>
              </ng-container>
              <ng-container matColumnDef="options">
                <th mat-header-cell *matHeaderCellDef>Opciones</th>
                <td mat-cell *matCellDef="let u">
                  <mat-slide-toggle
                    class="mr-2"
                    [checked]="!!u.is_active"
                    (change)="toggleActivo(u, $event.checked)"
                  />
                  <button
                    matIconButton
                    (click)="openEdit(u)"
                  >
                    <mat-icon svgIcon="pencil" />
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
              ></tr>
            </table>
          </div>

          @if (!usuarios().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay usuarios
            </div>
          }

          <mat-paginator
            [length]="total()"
            [pageSize]="25"
            [pageIndex]="page() - 1"
            (page)="onPage($event)"
          />
        </div>
      }
    </div>
  `,
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

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
