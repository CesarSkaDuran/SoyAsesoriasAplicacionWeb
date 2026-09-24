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
import { SearchableSelect } from '@/app/core/ui/searchable-select';
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
    SearchableSelect,
  ],
  templateUrl: './gastos.page.html',
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
      .open(GastoDialog, { width: '760px', maxWidth: '95vw', data: {} })
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
