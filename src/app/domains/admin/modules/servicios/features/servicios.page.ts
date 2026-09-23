import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import {
  PAGO_STATUS,
  PAGO_STATUS_COLOR,
  SERVICIO_STATUS,
  SERVICIO_STATUS_COLOR,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { ServicioRegistroDialog } from '../components/servicio-registro.dialog';

@Component({
  selector: 'servicios-page',
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
        [title]="titulo()"
        [subtitle]="total() + ' registros'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Solicitar
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
            placeholder="Nombre de la empresa o documento"
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
            <mat-option [value]="1">Pendiente</mat-option>
            <mat-option [value]="4">En trámite</mat-option>
            <mat-option [value]="2">Finalizado</mat-option>
            <mat-option [value]="3">Verificado</mat-option>
            <mat-option [value]="5">Cancelado</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado pago</mat-label>
          <mat-select [formControl]="statusPagoControl">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option [value]="1">Pagado</mat-option>
            <mat-option [value]="2">Pendiente</mat-option>
            <mat-option [value]="3">Cancelado</mat-option>
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
              [dataSource]="registros()"
              class="w-full"
            >
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let r">{{ r.id }}</td>
              </ng-container>
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre Empresa</th>
                <td mat-cell *matCellDef="let r">
                  <div class="font-medium">{{ r.cliente_nombre || '—' }}</div>
                  @if (r.empleado_nombre) {
                    <div class="text-xs text-neutral-500">{{ r.empleado_nombre }}</div>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Documento</th>
                <td mat-cell *matCellDef="let r">{{ r.cliente_nit || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tipo">
                <th mat-header-cell *matHeaderCellDef>Tipo Cliente</th>
                <td mat-cell *matCellDef="let r">{{ r.tipo_cliente || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="sucursal">
                <th mat-header-cell *matHeaderCellDef>Sucursal</th>
                <td mat-cell *matCellDef="let r">
                  {{ r.sucursal_nombre || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="paquete">
                <th mat-header-cell *matHeaderCellDef>Paquete</th>
                <td mat-cell *matCellDef="let r">
                  <div>{{ r.paquete || r.nombre || '—' }}</div>
                  @if (r.obs) {
                    <div class="max-w-56 truncate text-xs text-neutral-400">{{ r.obs }}</div>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Registro</th>
                <td mat-cell *matCellDef="let r">{{ r.fecha | date: 'dd/MM/yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="rep">
                <th mat-header-cell *matHeaderCellDef>Rep. Legal</th>
                <td mat-cell *matCellDef="let r">{{ r.representante || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tel">
                <th mat-header-cell *matHeaderCellDef>Teléfono/Contacto</th>
                <td mat-cell *matCellDef="let r">{{ r.telefono || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="valor">
                <th mat-header-cell *matHeaderCellDef>Valor</th>
                <td mat-cell *matCellDef="let r" class="font-semibold">
                  {{ r.valor ? (r.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0') : '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="estado2">
                <th mat-header-cell *matHeaderCellDef>Estado Pago</th>
                <td mat-cell *matCellDef="let r">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [ngClass]="pagoColor(r.status_pago)"
                  >
                    {{ pagoLabel(r.status_pago) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado Servicio</th>
                <td mat-cell *matCellDef="let r">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                    [ngClass]="statusColor(r.status)"
                  >
                    {{ statusLabel(r.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let r">
                  <button
                    matIconButton
                    [matMenuTriggerFor]="menu"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" />
                  </button>
                  <mat-menu #menu="matMenu">
                    @if (isAdmin()) {
                      @for (s of [1, 4, 2, 3, 5]; track s) {
                        <button
                          mat-menu-item
                          (click)="setStatus(r, s)"
                        >
                          Marcar: {{ statusLabel(s) }}
                        </button>
                      }
                      <button
                        mat-menu-item
                        (click)="setStatusPago(r, 1)"
                      >
                        Pago: Pagado
                      </button>
                      <button
                        mat-menu-item
                        (click)="setStatusPago(r, 2)"
                      >
                        Pago: Pendiente
                      </button>
                    }
                    <button
                      mat-menu-item
                      (click)="openEdit(r)"
                    >
                      Editar
                    </button>
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

          @if (!registros().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay registros de este servicio
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
export default class ServiciosPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  registros = signal<ServicioRegistro[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  categoria = signal<string>('');
  titulo = signal<string>('Servicios');
  isAdmin = () => this.creds.isAdmin();

  searchControl = new FormControl('');
  statusControl = new FormControl<number | null>(null);
  statusPagoControl = new FormControl<number | null>(null);
  empresaControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de servicios
  columns = [
    'id',
    'nombre',
    'nit',
    'tipo',
    'sucursal',
    'paquete',
    'fecha',
    'rep',
    'tel',
    'valor',
    'estado2',
    'estado',
    'acciones',
  ];

  constructor() {
    this.route.data.subscribe((d) => {
      this.categoria.set(d['categoria'] || '');
      this.titulo.set(d['titulo'] || 'Servicios');
      this.page.set(1);
      this.load();
    });

    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.statusPagoControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
  }

  load() {
    this.loading.set(true);
    this.api
      .servicioRegistros({
        nombre: this.categoria(),
        empresa_id: this.empresaControl.value ?? undefined,
        status: this.statusControl.value ?? undefined,
        status_pago: this.statusPagoControl.value ?? undefined,
        search: this.searchControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.registros.set(r.data);
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

  statusLabel = (s: number) => SERVICIO_STATUS[s] || '—';
  statusColor = (s: number) => SERVICIO_STATUS_COLOR[s] || 'bg-neutral-400';
  pagoLabel = (s: number) => PAGO_STATUS[s] || '—';
  pagoColor = (s: number) => PAGO_STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(r: ServicioRegistro, status: number) {
    this.api.updateServicioRegistro(r.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  setStatusPago(r: ServicioRegistro, status_pago: number) {
    this.api.updateServicioRegistro(r.id, { status_pago }).subscribe(() => {
      this.snack.open('Estado de pago actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(ServicioRegistroDialog, {
        width: '560px',
        data: { categoria: this.categoria(), empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(r: ServicioRegistro) {
    this.dialog
      .open(ServicioRegistroDialog, {
        width: '560px',
        data: { registro: r, categoria: this.categoria(), empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
