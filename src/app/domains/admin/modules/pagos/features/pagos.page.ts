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
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { CatalogoItem } from '@/app/models/empleado.model';
import {
  CUENTA_STATUS,
  CUENTA_STATUS_COLOR,
  CuentaCobro,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { CuentaCobroDialog } from '../components/cuenta-cobro.dialog';

@Component({
  selector: 'pagos-page',
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
    SearchableSelect,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Pagos"
        [subtitle]="total() + ' cuentas de cobro'"
      >
        @if (isAdmin()) {
          <button
            matButton="filled"
            (click)="openCreate()"
          >
            <mat-icon svgIcon="plus" />
            Nueva cuenta
          </button>
        }
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
            placeholder="Ingrese nombre de la empresa o el nit"
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
            <mat-option [value]="2">Pendiente</mat-option>
            <mat-option [value]="1">Pagado</mat-option>
            <mat-option [value]="3">En trámite</mat-option>
            <mat-option [value]="4">Activo</mat-option>
            <mat-option [value]="5">Rechazado</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-52"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Concepto</mat-label>
          <mat-select [formControl]="conceptoControl">
            <mat-option value="">Todos</mat-option>
            @for (concepto of conceptos; track concepto) {
              <mat-option [value]="concepto">{{ concepto }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <searchable-select
          class="w-52"
          label="Sucursal"
          nullLabel="Todas"
          [items]="sucursales()"
          displayKey="nombre"
          [formControl]="sucursalControl"
        />
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
              [dataSource]="cuentas()"
              class="w-full"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Recibo N°</th>
                <td mat-cell *matCellDef="let c">{{ c.numero || c.id }}</td>
              </ng-container>
              <ng-container matColumnDef="company">
                <th mat-header-cell *matHeaderCellDef>Cliente</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.cliente_nombre || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Nit/Cc</th>
                <td mat-cell *matCellDef="let c">{{ c.cliente_nit || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tipo">
                <th mat-header-cell *matHeaderCellDef>Tipo</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.tipo === 1 ? 'Normal' : 'Recurrente' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Sucursal</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.sucursal_nombre || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="fecha_pago">
                <th mat-header-cell *matHeaderCellDef>Fecha de pagado</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.fecha | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Inicio Pago</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.created_at | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="date2">
                <th mat-header-cell *matHeaderCellDef>Próximo Pago</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.updated_at | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="concept">
                <th mat-header-cell *matHeaderCellDef>Concepto</th>
                <td mat-cell *matCellDef="let c">{{ c.nombre || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let c">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [ngClass]="statusColor(c.status)"
                  >
                    {{ statusLabel(c.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="value">
                <th mat-header-cell *matHeaderCellDef>Valor</th>
                <td mat-cell *matCellDef="let c" class="font-semibold">
                  {{ c.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="options">
                <th mat-header-cell *matHeaderCellDef>Opciones</th>
                <td mat-cell *matCellDef="let c">
                  @if (isAdmin()) {
                    <button
                      matIconButton
                      [matMenuTriggerFor]="menu"
                    >
                      <mat-icon svgIcon="ellipsis-vertical" />
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="setStatus(c, 1)">Marcar pagada</button>
                      <button mat-menu-item (click)="setStatus(c, 3)">En trámite</button>
                      <button mat-menu-item (click)="setStatus(c, 5)">Rechazar</button>
                      <button mat-menu-item (click)="openEdit(c)">Editar</button>
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

          @if (!cuentas().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay cuentas de cobro
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
export default class PagosPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cuentas = signal<CuentaCobro[]>([]);
  empresas = signal<Empresa[]>([]);
  sucursales = signal<CatalogoItem[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  searchControl = new FormControl('');
  statusControl = new FormControl<number | null>(null);
  empresaControl = new FormControl<number | null>(null);
  conceptoControl = new FormControl('');
  sucursalControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);
  conceptos = [
    'Afiliaciones',
    'Planillas',
    'Asesorias',
    'Comisiones',
    'Honorarios',
    'Servicio Permanente',
    'Incapacidades',
    'Otro',
  ];

  // Mismo orden que la tabla vieja de administration
  columns = [
    'id',
    'company',
    'nit',
    'tipo',
    'date',
    'fecha_pago',
    'fecha',
    'date2',
    'concept',
    'status',
    'value',
    'options',
  ];

  constructor() {
    this.api.catalogos().subscribe((catalogos) => {
      this.sucursales.set(catalogos['sucursales'] ?? []);
    });
    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.conceptoControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.sucursalControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
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
      .pagos({
        empresa_id: this.empresaControl.value ?? undefined,
        status: this.statusControl.value ?? undefined,
        search: this.searchControl.value || undefined,
        concepto: this.conceptoControl.value || undefined,
        sucursal_id: this.sucursalControl.value ?? undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.cuentas.set(r.data);
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

  setStatus(c: CuentaCobro, status: number) {
    this.api.updatePago(c.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(CuentaCobroDialog, {
        width: '760px',
        maxWidth: '95vw',
        data: { empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(c: CuentaCobro) {
    this.dialog
      .open(CuentaCobroDialog, {
        width: '760px',
        maxWidth: '95vw',
        data: { cuenta: c, empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
