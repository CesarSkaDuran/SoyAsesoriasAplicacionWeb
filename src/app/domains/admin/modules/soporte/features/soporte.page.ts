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
import {
  SOPORTE_STATUS,
  Soporte,
} from '@/app/models/negocio.model';
import { SoporteDialog } from '../components/soporte.dialog';

const STATUS_COLOR: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-neutral-400',
  5: 'bg-amber-500',
};

@Component({
  selector: 'soporte-page',
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
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Soporte"
        [subtitle]="total() + ' tickets'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Nuevo ticket
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
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option [value]="1">Pendiente</mat-option>
            <mat-option [value]="2">En proceso</mat-option>
            <mat-option [value]="3">Resuelto</mat-option>
            <mat-option [value]="4">Cerrado</mat-option>
            <mat-option [value]="5">Rechazado</mat-option>
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
              [dataSource]="soportes()"
              class="w-full"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Ticket</th>
                <td mat-cell *matCellDef="let s">{{ s.id }}</td>
              </ng-container>
              <ng-container matColumnDef="company">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let s">
                  <div class="font-medium">
                    {{ s.nombre || (s.user_name ? s.user_name + ' ' + (s.user_lastname || '') : '—') }}
                  </div>
                  @if (s.empresa_nombre) {
                    <div class="text-xs text-neutral-500">{{ s.empresa_nombre }}</div>
                  }
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
                <td mat-cell *matCellDef="let s">
                  {{ s.tipo_servicio || s.asunto || '—' }}
                </td>
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
                  <div class="max-w-80 truncate">{{ s.mensaje || '—' }}</div>
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
                      <button mat-menu-item (click)="setStatus(s, 2)">En proceso</button>
                      <button mat-menu-item (click)="setStatus(s, 3)">Resuelto</button>
                      <button mat-menu-item (click)="setStatus(s, 4)">Cerrar</button>
                      <button mat-menu-item (click)="setStatus(s, 5)">Rechazar</button>
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

          @if (!soportes().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay tickets de soporte
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
export default class SoportePage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  soportes = signal<Soporte[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = this.creds.isAdmin;

  searchControl = new FormControl('');
  statusControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de soporte
  columns = ['id', 'company', 'nit', 'date', 'value', 'status', 'concept', 'options'];

  constructor() {
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
      .soportes({
        status: this.statusControl.value ?? undefined,
        search: this.searchControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.soportes.set(r.data);
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

  statusLabel = (s: number) => SOPORTE_STATUS[s] || '—';
  statusColor = (s: number) => STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(s: Soporte, status: number) {
    this.api.updateSoporte(s.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(SoporteDialog, { width: '520px' })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
