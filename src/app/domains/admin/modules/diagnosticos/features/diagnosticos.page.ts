import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Diagnostico, Usuario } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { DiagnosticoFormDialog } from '../components/diagnostico-form.dialog';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  logrado: 'Logrado',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-500',
  en_progreso: 'bg-sky-500',
  logrado: 'bg-emerald-500',
  cancelado: 'bg-neutral-400',
};
const ESTADO_HEX: Record<string, string> = {
  pendiente: '#f59e0b',
  en_progreso: '#0ea5e9',
  logrado: '#10b981',
  cancelado: '#a3a3a3',
};

@Component({
  selector: 'diagnosticos-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatIcon,
    MatProgressSpinner,
    DatePipe,
    PageHeader,
    SearchableSelect,
    NgApexchartsModule,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Diagnósticos"
        [subtitle]="total() + ' registrados'"
      >
        @if (isAdmin()) {
          <div class="flex gap-3">
            <button
              matButton="tonal"
              routerLink="/admin/diagnosticos/config"
            >
              <mat-icon svgIcon="settings" />
              Configurar
            </button>
            <button
              matButton="filled"
              (click)="openCreate()"
            >
              <mat-icon svgIcon="plus" />
              Nuevo diagnóstico
            </button>
          </div>
        }
      </page-header>

      <!-- Mini cards de stats (como el sistema anterior) -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950">
              <mat-icon svgIcon="file-text" />
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats().total }}</div>
              <div class="text-xs text-neutral-500">Diagnósticos</div>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950">
              <mat-icon svgIcon="list-check" />
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats().en_progreso }}</div>
              <div class="text-xs text-neutral-500">En progreso</div>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
              <mat-icon svgIcon="circle-check" />
            </div>
            <div>
              <div class="text-2xl font-bold">{{ stats().logrados }}</div>
              <div class="text-xs text-neutral-500">Logrados</div>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950">
              <mat-icon svgIcon="search" />
            </div>
            <div>
              <div class="text-2xl font-bold">{{ total() }}</div>
              <div class="text-xs text-neutral-500">En esta vista</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribución por estado -->
      @if (stats().por_estado?.length) {
        <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 class="mb-2 font-bold text-neutral-700 dark:text-neutral-300">Distribución por estado</h3>
          <apx-chart
            [series]="stats().por_estado!.map(s => s.total)"
            [labels]="stats().por_estado!.map(s => estadoLabel(s.estado))"
            [chart]="{ type: 'donut', height: 230, fontFamily: 'inherit' }"
            [colors]="stats().por_estado!.map(s => estadoHex(s.estado))"
            [legend]="{ position: 'right', fontSize: '13px' }"
            [dataLabels]="{ enabled: true }"
            [stroke]="{ width: 2 }"
            [plotOptions]="{ pie: { donut: { size: '68%' } } }"
          />
        </div>
      }

      <!-- Filtros (mismos del viejo: cliente, responsable, estado, fechas) -->
      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field class="w-64" appearance="outline" subscriptSizing="dynamic">
          <mat-icon svgIcon="search" matIconPrefix />
          <input matInput [formControl]="searchControl" placeholder="Buscar diagnóstico…" />
        </mat-form-field>
        @if (isAdmin()) {
          <searchable-select
            class="w-56"
            label="Cliente"
            nullLabel="Todos los clientes"
            [items]="empresas()"
            displayKey="razon_social"
            [formControl]="empresaControl"
          />
          <searchable-select
            class="w-56"
            label="Responsable"
            nullLabel="Todos los responsables"
            [items]="usuarios()"
            displayKey="nombre_completo"
            [formControl]="responsableControl"
          />
        }
        <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="estadoControl">
            <mat-option [value]="null">Todos los estados</mat-option>
            <mat-option value="pendiente">Pendiente</mat-option>
            <mat-option value="en_progreso">En progreso</mat-option>
            <mat-option value="logrado">Logrado</mat-option>
            <mat-option value="cancelado">Cancelado</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field class="w-40" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Desde</mat-label>
          <input matInput [matDatepicker]="dpDesde" [formControl]="desdeControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpDesde" />
          <mat-datepicker #dpDesde />
        </mat-form-field>
        <mat-form-field class="w-40" appearance="outline" subscriptSizing="dynamic">
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
      } @else if (!diagnosticos().length) {
        <div class="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <mat-icon svgIcon="file-plus" class="!h-12 !w-12 text-neutral-300" />
          <h2 class="mt-3 text-lg font-semibold text-neutral-600 dark:text-neutral-300">No hay diagnósticos registrados</h2>
          <p class="mt-1 text-sm text-neutral-400">Crea el primer diagnóstico para comenzar a documentar los análisis de tus clientes.</p>
          @if (isAdmin()) {
            <button matButton="filled" class="mt-4" (click)="openCreate()">
              <mat-icon svgIcon="plus" />
              Nuevo diagnóstico
            </button>
          }
        </div>
      } @else {
        <!-- Tarjetas de diagnósticos (layout del sistema anterior) -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          @for (d of diagnosticos(); track d.id) {
            <a
              [routerLink]="['/admin/diagnosticos', d.id]"
              class="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <h2 class="truncate text-lg font-semibold group-hover:text-sky-700 dark:group-hover:text-sky-400">
                    {{ d.nombre }}
                  </h2>
                  <div class="mt-2 space-y-1 text-sm">
                    <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <span class="w-24 text-neutral-400">Cliente:</span>
                      <strong>{{ d.empresa_nombre || d.persona_nombre || '—' }}</strong>
                    </div>
                    <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <span class="w-24 text-neutral-400">Responsable:</span>
                      <strong>{{ d.responsable_nombre || 'Sin asignar' }}</strong>
                    </div>
                    <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <span class="w-24 text-neutral-400">Fechas:</span>
                      <strong>{{ d.fecha_inicio | date: 'dd/MM/yyyy' }}</strong>
                      al
                      <strong>{{ d.fecha_fin | date: 'dd/MM/yyyy' }}</strong>
                    </div>
                  </div>
                </div>
                <span
                  class="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white {{ estadoColor(d.estado) }}"
                >
                  {{ estadoLabel(d.estado) }}
                </span>
              </div>
            </a>
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="25"
          [pageIndex]="page() - 1"
          (page)="onPage($event)"
        />
      }
    </div>
  `,
})
export default class DiagnosticosPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);

  diagnosticos = signal<Diagnostico[]>([]);
  empresas = signal<Empresa[]>([]);
  usuarios = signal<(Usuario & { nombre_completo: string })[]>([]);
  total = signal(0);
  page = signal(1);
  stats = signal<{ total: number; en_progreso: number; logrados: number; por_estado?: { estado: string; total: number }[] }>(
    { total: 0, en_progreso: 0, logrados: 0 }
  );
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  searchControl = new FormControl('');
  empresaControl = new FormControl<number | null>(null);
  responsableControl = new FormControl<number | null>(null);
  estadoControl = new FormControl<string | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  constructor() {
    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.api.usuarios({}).subscribe((r) =>
        this.usuarios.set(r.data.map((u) => ({ ...u, nombre_completo: `${u.name} ${u.lastname ?? ''}`.trim() })))
      );
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
      this.responsableControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.estadoControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });

    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .diagnosticos({
        search: this.searchControl.value || undefined,
        empresa_id: this.empresaControl.value ?? undefined,
        responsable_id: this.responsableControl.value ?? undefined,
        estado: this.estadoControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.diagnosticos.set(r.data);
          this.total.set(r.total);
          this.stats.set(r.stats);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  estadoLabel = (s: string) => ESTADO_LABEL[s] || s;
  estadoColor = (s: string) => ESTADO_COLOR[s] || 'bg-neutral-400';
  estadoHex = (s: string) => ESTADO_HEX[s] || '#a3a3a3';

  openCreate() {
    this.dialog
      .open(DiagnosticoFormDialog, {
        width: '720px',
        data: { empresas: this.empresas(), usuarios: this.usuarios() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
