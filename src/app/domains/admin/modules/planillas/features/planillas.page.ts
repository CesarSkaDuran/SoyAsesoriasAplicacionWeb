import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { PlanillaDocsDialog } from '../components/planilla-docs.dialog';
import { PlanillaIndependienteDialog } from '../components/planilla-independiente.dialog';

const STATUS_LABEL: Record<string, string> = {
  solicitada: 'Pendiente de revisión',
  generada: 'Generada',
  pagada: 'Pagada',
  verificada: 'Verificada',
};
const STATUS_COLOR: Record<string, string> = {
  solicitada: 'bg-amber-500 text-white',
  generada: 'bg-blue-500 text-white',
  pagada: 'bg-green-500 text-white',
  verificada: 'bg-indigo-500 text-white',
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PlanillasPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  planillas = signal<Planilla[]>([]);
  empresas = signal<Empresa[]>([]);
  ingresos = signal<{ ingreso_mensual: number | string | null; ingreso_adicional: number | string | null } | null>(null);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();
  isIndependent = () => this.creds.role === 'independiente';

  periodoControl = new FormControl('');
  empresaControl = new FormControl<number | null>(null);

  columns = signal<string[]>([]);

  constructor() {
    // Mismo orden que la tabla vieja de planillas
    this.columns.set(
      this.isIndependent()
        ? ['periodo', 'ingresos', 'pago_ss', 'fecha_pago', 'status', 'acciones']
        : ['periodo', 'empleados', 'salarios', 'ingresos', 'pago_ss', 'otros', 'fecha_pago', 'status', 'acciones']
    );

    if (this.isAdmin()) {
      this.api.empresas().subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    } else if (this.isIndependent()) {
      this.api.planillaIngresos().subscribe((r) => this.ingresos.set(r));
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
  statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-400 text-white';
  totalPendiente(p: Planilla): boolean {
    return p.status === 'solicitada' && !(Number(p.valor_total) || 0);
  }

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

  openIndependentDiligence(planilla?: Planilla) {
    const ingresos = this.ingresos();
    if (!ingresos) {
      this.snack.open('No se encontró la ficha de independiente asociada', 'Cerrar', { duration: 3500 });
      return;
    }
    this.dialog
      .open(PlanillaIndependienteDialog, {
        width: '560px',
        data: { ingresos, planilla },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openDocs(p: Planilla) {
    this.dialog.open(PlanillaDocsDialog, {
      width: '620px',
      data: { planilla: p },
    });
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
