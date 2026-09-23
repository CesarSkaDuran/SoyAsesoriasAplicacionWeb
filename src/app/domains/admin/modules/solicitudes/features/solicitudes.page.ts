import { DatePipe, NgClass } from '@angular/common';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Solicitud } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { SolicitudDialog } from '../components/solicitud.dialog';

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  rechazada: 'Rechazada',
};
const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-red-500',
  en_proceso: 'bg-blue-500',
  completada: 'bg-green-500',
  rechazada: 'bg-neutral-400',
};

@Component({
  selector: 'solicitudes-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    DatePipe,
    NgClass,
    PageHeader,
    SearchableSelect,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Solicitudes"
        [subtitle]="total() + ' solicitudes'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Nueva solicitud
        </button>
      </page-header>

      <!-- Filtros como la app vieja -->
      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field
          class="w-72"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-icon svgIcon="search" matIconPrefix />
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Nombre de la cuenta o por valor"
          />
        </mat-form-field>
        @if (isAdmin()) {
          <searchable-select
            class="w-64"
            label="Empresa"
            nullLabel="Todas"
            [items]="empresas()"
            displayKey="razon_social"
            [formControl]="empresaControl"
          />
        }
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option value="pendiente">Pendiente</mat-option>
            <mat-option value="en_proceso">En proceso</mat-option>
            <mat-option value="completada">Completada</mat-option>
            <mat-option value="rechazada">Rechazada</mat-option>
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
              [dataSource]="solicitudes()"
              class="w-full"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Ticket</th>
                <td mat-cell *matCellDef="let s">{{ s.id }}</td>
              </ng-container>
              <ng-container matColumnDef="company">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let s">
                  <div class="font-medium">{{ s.cliente_nombre || '—' }}</div>
                  <div class="text-xs text-neutral-500">{{ s.cliente_nit }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let s">{{ s.telefono || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let s">
                  {{ s.created_at | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="value">
                <th mat-header-cell *matHeaderCellDef>Servicio</th>
                <td mat-cell *matCellDef="let s">{{ s.servicio_nombre || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let s">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [ngClass]="statusColor(s.status)"
                  >
                    {{ statusLabel(s.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="concept">
                <th mat-header-cell *matHeaderCellDef>Descripción</th>
                <td mat-cell *matCellDef="let s">
                  <div class="max-w-80 truncate">{{ s.descripcion || '—' }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="options">
                <th mat-header-cell *matHeaderCellDef>Opciones</th>
                <td mat-cell *matCellDef="let s">
                  @if (isAdmin()) {
                    <button
                      matIconButton
                      [matMenuTriggerFor]="menu"
                    >
                      <mat-icon svgIcon="ellipsis-vertical" />
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="setStatus(s, 'en_proceso')">En proceso</button>
                      <button mat-menu-item (click)="setStatus(s, 'completada')">Completar</button>
                      <button mat-menu-item (click)="setStatus(s, 'rechazada')">Rechazar</button>
                    </mat-menu>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
              ></tr>
            </table>
          </div>

          @if (!solicitudes().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay solicitudes
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
export default class SolicitudesPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  solicitudes = signal<Solicitud[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  searchControl = new FormControl('');
  statusControl = new FormControl<string | null>(null);
  empresaControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de solicitudes
  columns = ['id', 'company', 'nit', 'date', 'value', 'status', 'concept', 'options'];

  constructor() {
    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
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
      .solicitudes({
        empresa_id: this.empresaControl.value ?? undefined,
        status: this.statusControl.value || undefined,
        search: this.searchControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.solicitudes.set(r.data);
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

  statusLabel = (s: string) => STATUS_LABEL[s] || s;
  statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(s: Solicitud, status: Solicitud['status']) {
    this.api.updateSolicitud(s.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(SolicitudDialog, { width: '520px', data: { empresas: this.empresas() } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
