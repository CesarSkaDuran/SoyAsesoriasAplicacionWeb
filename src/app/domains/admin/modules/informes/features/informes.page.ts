import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';

type Tab = 'ingresos' | 'egresos' | 'servicios';

interface FilaInforme {
  grupo: string;
  registros: number;
  total: number;
  pagado?: number;
  pendiente?: number;
}

// Replica el modulo de informes viejo (informeingresos/informeegresos
// por dia y por cliente + informe de servicios).
@Component({
  selector: 'informes-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatTableModule,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    PageHeader,
    NgApexchartsModule,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Informes"
        subtitle="Ingresos, egresos y servicios"
      />

      <mat-tab-group
        [selectedIndex]="tabIndex()"
        (selectedIndexChange)="onTab($event)"
        class="rounded-xl border border-neutral-200 bg-white"
      >
        @for (t of tabs; track t.id) {
          <mat-tab [label]="t.label" />
        }
      </mat-tab-group>

      <!-- Filtros -->
      <div
        class="flex flex-wrap items-end gap-4 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <form [formGroup]="rango" class="flex flex-wrap items-end gap-4">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Desde</mat-label>
            <input
              matInput
              [matDatepicker]="pDesde"
              formControlName="desde"
            />
            <mat-datepicker-toggle matIconSuffix [for]="pDesde" />
            <mat-datepicker #pDesde />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Hasta</mat-label>
            <input
              matInput
              [matDatepicker]="pHasta"
              formControlName="hasta"
            />
            <mat-datepicker-toggle matIconSuffix [for]="pHasta" />
            <mat-datepicker #pHasta />
          </mat-form-field>

          @if (tab() !== 'servicios') {
            <mat-button-toggle-group formControlName="agrupar">
              <mat-button-toggle value="dia">Por día</mat-button-toggle>
              <mat-button-toggle value="cliente">Por cliente</mat-button-toggle>
              <mat-button-toggle value="sucursal">
                Por sucursal
              </mat-button-toggle>
            </mat-button-toggle-group>
          }
        </form>

        <button
          matButton="filled"
          (click)="load()"
        >
          <mat-icon svgIcon="search" />
          Consultar
        </button>
      </div>

      <!-- Gráfica dinámica -->
      @if (!loading() && filas().length) {
        <div
          class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <h3 class="mb-2 font-bold text-neutral-700">
            {{ chartTitle() }}
          </h3>
          @if (chartIsTime()) {
            <apx-chart
              [series]="[{ name: 'Total', data: filas().map(f => f.total) }]"
              [chart]="{ type: 'area', height: 240, toolbar: { show: false }, fontFamily: 'inherit' }"
              [xaxis]="{ categories: diaCategories() }"
              [stroke]="{ curve: 'smooth', width: 2 }"
              [fill]="{ type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } }"
              [dataLabels]="{ enabled: false }"
              [colors]="[chartColor()]"
              [yaxis]="{ labels: { formatter: copShort } }"
              [tooltip]="{ y: { formatter: copFull } }"
              [grid]="{ borderColor: '#e5e6e9', strokeDashArray: 4 }"
            />
          } @else {
            <apx-chart
              [series]="barSeries()"
              [chart]="{ type: 'bar', height: chartHeight(), stacked: showPagado(), toolbar: { show: false }, fontFamily: 'inherit' }"
              [xaxis]="{ categories: filas().map(f => f.grupo), labels: { formatter: copShort } }"
              [plotOptions]="{ bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } }"
              [dataLabels]="{ enabled: false }"
              [colors]="barColors()"
              [tooltip]="{ y: { formatter: copFull } }"
              [legend]="{ show: showPagado(), position: 'top' }"
              [grid]="{ borderColor: '#e5e6e9', strokeDashArray: 4 }"
            />
          }
        </div>
      }

      <!-- Resultado -->
      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else {
        <div
          class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
        >
          <table
            mat-table
            [dataSource]="filas()"
            class="w-full"
          >
            <ng-container matColumnDef="grupo">
              <th mat-header-cell *matHeaderCellDef>
                {{
                  tab() === 'servicios'
                    ? 'Categoría'
                    : agrupar() === 'cliente'
                      ? 'Cliente'
                      : agrupar() === 'sucursal'
                        ? 'Sucursal'
                        : 'Fecha'
                }}
              </th>
              <td mat-cell *matCellDef="let f">
                @if (agrupar() === 'dia' && tab() !== 'servicios') {
                  {{ f.grupo | date: 'mediumDate' }}
                } @else {
                  {{ f.grupo }}
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="registros">
              <th mat-header-cell *matHeaderCellDef>Registros</th>
              <td mat-cell *matCellDef="let f">{{ f.registros }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td
                mat-cell
                *matCellDef="let f"
                class="font-semibold"
              >
                {{ f.total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            @if (showPagado()) {
              <ng-container matColumnDef="pagado">
                <th mat-header-cell *matHeaderCellDef>Pagado</th>
                <td
                  mat-cell
                  *matCellDef="let f"
                  class="text-green-600"
                >
                  {{ f.pagado | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="pendiente">
                <th mat-header-cell *matHeaderCellDef>Pendiente</th>
                <td
                  mat-cell
                  *matCellDef="let f"
                  class="text-red-500"
                >
                  {{ f.pendiente | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
            }
            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns()"
            ></tr>
          </table>
          @if (!filas().length) {
            <div class="py-16 text-center text-neutral-400">
              Sin datos en el rango seleccionado
            </div>
          }
        </div>
      }
    </div>
  `,
})
export default class InformesPage {
  private api = inject(ApiService);

  tabs: { id: Tab; label: string }[] = [
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'egresos', label: 'Egresos' },
    { id: 'servicios', label: 'Servicios' },
  ];

  tab = signal<Tab>('ingresos');
  tabIndex = signal(0);
  agrupar = signal<'dia' | 'cliente' | 'sucursal'>('dia');
  filas = signal<FilaInforme[]>([]);
  loading = signal(false);

  rango = new FormGroup({
    desde: new FormControl<Date | null>(null),
    hasta: new FormControl<Date | null>(null),
    agrupar: new FormControl<'dia' | 'cliente' | 'sucursal'>('dia', {
      nonNullable: true,
    }),
  });

  constructor() {
    this.load();
  }

  columns = () =>
    this.showPagado()
      ? ['grupo', 'registros', 'total', 'pagado', 'pendiente']
      : ['grupo', 'registros', 'total'];

  showPagado = () =>
    (this.tab() === 'ingresos' && this.agrupar() !== 'dia') ||
    this.tab() === 'servicios';

  // ---- Gráfica ----
  chartIsTime = () => this.agrupar() === 'dia' && this.tab() !== 'servicios';

  chartTitle = () => {
    const t = this.tab() === 'ingresos' ? 'Ingresos' : this.tab() === 'egresos' ? 'Egresos' : 'Servicios';
    const g = this.chartIsTime() ? 'por día' : this.tab() === 'servicios' ? 'por categoría' : `por ${this.agrupar()}`;
    return `${t} ${g}`;
  };

  chartColor = () => (this.tab() === 'egresos' ? '#ef4444' : this.tab() === 'servicios' ? '#8b5cf6' : '#0154f9');

  chartHeight = () => Math.min(120 + this.filas().length * 34, 480);

  barSeries = () =>
    this.showPagado()
      ? [
          { name: 'Pagado', data: this.filas().map((f) => f.pagado ?? 0) },
          { name: 'Pendiente', data: this.filas().map((f) => f.pendiente ?? 0) },
        ]
      : [{ name: 'Total', data: this.filas().map((f) => f.total) }];

  barColors = () => (this.showPagado() ? ['#10b981', '#f59e0b'] : [this.chartColor()]);

  private datePipe = new DatePipe('es-CO');
  diaCategories = () =>
    this.filas().map((f) => this.datePipe.transform(f.grupo, 'dd MMM') ?? f.grupo);

  copShort = (v: number) =>
    new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  copFull = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  onTab(i: number) {
    this.tabIndex.set(i);
    this.tab.set(this.tabs[i].id);
    this.load();
  }

  load() {
    this.loading.set(true);
    const v = this.rango.getRawValue();
    const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
    this.agrupar.set(v.agrupar);

    const filters = { desde: fmt(v.desde), hasta: fmt(v.hasta) };
    const obs =
      this.tab() === 'ingresos'
        ? this.api.informeIngresos({ ...filters, agrupar: v.agrupar })
        : this.tab() === 'egresos'
          ? this.api.informeEgresos({ ...filters, agrupar: v.agrupar })
          : this.api.informeServicios(filters);

    obs.subscribe({
      next: (r) => {
        this.filas.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
