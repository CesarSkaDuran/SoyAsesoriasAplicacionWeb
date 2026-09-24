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
  en_progreso: '#0154f9',
  logrado: '#10b981',
  cancelado: '#4b4e56',
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
  templateUrl: './diagnosticos.page.html',
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
  estadoHex = (s: string) => ESTADO_HEX[s] || '#4b4e56';

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
