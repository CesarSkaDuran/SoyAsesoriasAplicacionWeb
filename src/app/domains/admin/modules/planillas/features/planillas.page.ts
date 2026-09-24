import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { Planilla } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { PlanillaDialog } from '../components/planilla.dialog';

const STATUS_LABEL: Record<string, string> = {
  generada: 'Generada',
  pagada: 'Pagada',
  verificada: 'Verificada',
};
const STATUS_COLOR: Record<string, string> = {
  generada: 'bg-blue-500',
  pagada: 'bg-green-500',
  verificada: 'bg-indigo-500',
};

@Component({
  selector: 'planillas-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  templateUrl: './planillas.page.html',
})
export default class PlanillasPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  planillas = signal<Planilla[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  periodoControl = new FormControl('');
  empresaControl = new FormControl<number | null>(null);

  columns = signal<string[]>([]);

  constructor() {
    // Mismo orden que la tabla vieja de planillas
    this.columns.set(
      ['periodo', 'empleados', 'salarios', 'pago_ss', 'otros', 'fecha_pago', 'status', 'acciones']
    );

    if (this.isAdmin()) {
      this.api.empresas().subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.periodoControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });

    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .planillas({
        empresa_id: this.empresaControl.value ?? undefined,
        periodo: this.periodoControl.value || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.planillas.set(r.data);
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

  setStatus(p: Planilla, status: Planilla['status']) {
    this.api.updatePlanilla(p.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(PlanillaDialog, { width: '520px', data: { empresas: this.empresas() } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(p: Planilla) {
    this.dialog
      .open(PlanillaDialog, {
        width: '520px',
        data: { planilla: p, empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }
}
