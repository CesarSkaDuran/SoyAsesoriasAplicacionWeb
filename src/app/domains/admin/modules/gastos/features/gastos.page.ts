import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
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
import { PageHeader } from '@/app/core/ui/page-header';
import { CatalogoItem } from '@/app/models/empleado.model';
import {
  CUENTA_STATUS,
  CUENTA_STATUS_COLOR,
  Gasto,
} from '@/app/models/negocio.model';
import { GastoDialog } from '../components/gasto.dialog';

@Component({
  selector: 'gastos-page',
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
    CurrencyPipe,
    DatePipe,
    NgClass,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Gastos"
        [subtitle]="total() + ' gastos'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Nuevo gasto
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
            <mat-option [value]="2">Pendiente</mat-option>
            <mat-option [value]="1">Pagado</mat-option>
            <mat-option [value]="3">En trámite</mat-option>
            <mat-option [value]="5">Rechazado</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-52"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Sucursal</mat-label>
          <mat-select [formControl]="sucursalControl">
            <mat-option [value]="null">Todas</mat-option>
            @for (sucursal of sucursales(); track sucursal.id) {
              <mat-option [value]="sucursal.id">{{ sucursal.nombre }}</mat-option>
            }
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
              [dataSource]="gastos()"
              class="w-full"
            >
              <ng-container matColumnDef="company">
                <th mat-header-cell *matHeaderCellDef>Proveedor</th>
                <td mat-cell *matCellDef="let g">
                  <div class="font-medium">{{ g.proveedor_nombre || '—' }}</div>
                  <div class="text-xs text-neutral-500">{{ g.tipo_nombre }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Nit/Cc</th>
                <td mat-cell *matCellDef="let g">{{ g.proveedor_nit || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Sucursal</th>
                <td mat-cell *matCellDef="let g">{{ g.sucursal_nombre || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="date2">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let g">{{ g.fecha | date: 'dd/MM/yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="concept">
                <th mat-header-cell *matHeaderCellDef>Concepto</th>
                <td mat-cell *matCellDef="let g">
                  {{ g.nombre || g.descripcion || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let g">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [ngClass]="statusColor(g.status ?? 2)"
                  >
                    {{ statusLabel(g.status ?? 2) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="value">
                <th mat-header-cell *matHeaderCellDef>Valor</th>
                <td mat-cell *matCellDef="let g" class="font-semibold">
                  {{ (+g.valor + (+g.iva || 0)) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="options">
                <th mat-header-cell *matHeaderCellDef>Opciones</th>
                <td mat-cell *matCellDef="let g">
                  <button
                    matIconButton
                    [matMenuTriggerFor]="menu"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" />
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="setStatus(g, 1)">Marcar pagado</button>
                    <button mat-menu-item (click)="setStatus(g, 3)">En trámite</button>
                    <button mat-menu-item (click)="openEdit(g)">Editar</button>
                    <button mat-menu-item (click)="remove(g)">Eliminar</button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
              ></tr>
            </table>
          </div>

          @if (!gastos().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay gastos registrados
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
export default class GastosPage {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  gastos = signal<Gasto[]>([]);
  sucursales = signal<CatalogoItem[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);

  searchControl = new FormControl('');
  statusControl = new FormControl<number | null>(null);
  sucursalControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de gastos
  columns = ['company', 'nit', 'date', 'date2', 'concept', 'status', 'value', 'options'];

  constructor() {
    this.api.catalogos().subscribe((catalogos) => {
      this.sucursales.set(catalogos['sucursales'] ?? []);
    });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.sucursalControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .gastos({
        search: this.searchControl.value || undefined,
        status: this.statusControl.value ?? undefined,
        sucursal_id: this.sucursalControl.value ?? undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.gastos.set(r.data);
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

  statusLabel = (s: number) => CUENTA_STATUS[s] || '—';
  statusColor = (s: number) => CUENTA_STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(g: Gasto, status: number) {
    this.api.updateGasto(g.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(GastoDialog, { width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(g: Gasto) {
    this.dialog
      .open(GastoDialog, {
        width: '760px',
        maxWidth: '95vw',
        data: { gasto: g },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  remove(g: Gasto) {
    this.api.deleteGasto(g.id).subscribe(() => {
      this.snack.open('Gasto eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
