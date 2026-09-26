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
  templateUrl: './informes.page.html',
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
  private asDate(v: string | null | undefined): Date | null {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  }
  diaCategories = () =>
    this.filas().map((f) => {
      const d = this.asDate(f.grupo);
      return d ? (this.datePipe.transform(d, 'dd MMM') ?? f.grupo) : (f.grupo ?? 'Sin fecha');
    });
  diaLabel = (f: FilaInforme) => {
    const d = this.asDate(f.grupo);
    return d ? this.datePipe.transform(d, 'mediumDate') : f.grupo || 'Sin fecha';
  };

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
