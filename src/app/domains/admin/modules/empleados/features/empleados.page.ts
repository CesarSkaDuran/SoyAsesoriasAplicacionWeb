import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Empleado } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { EmpleadoFormDialog } from '../components/empleado-form.dialog';

const TIPOS_CONTRATO: Record<string, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término fijo',
  obra_labor: 'Obra o labor',
  aprendizaje: 'Aprendizaje',
  prestacion_servicios: 'Prestación de servicios',
};

@Component({
  selector: 'empleados-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    CurrencyPipe,
    PageHeader,
    SearchableSelect,
  ],
  templateUrl: './empleados.page.html',
})
export default class EmpleadosPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  // Mismas columnas de la tabla vieja
  protected columns = [
    'nombre',
    'empresa',
    'n_doc',
    'tel',
    'cargo',
    'contrato',
    'salario',
    'estado',
    'acciones',
  ];
  protected empleados = signal<Empleado[]>([]);
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(true);
  protected searchControl = new FormControl('');
  protected empresaControl = new FormControl<number | null>(null);
  protected statusControl = new FormControl('todos');
  protected desdeControl = new FormControl<Date | null>(null);
  protected hastaControl = new FormControl<Date | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();

  protected currentEmpresaId(): number | null {
    return (
      this.empresaControl.value ?? this.credentials.user?.empresa?.id ?? null
    );
  }

  protected tipoContrato(t?: string): string {
    return t ? TIPOS_CONTRATO[t] ?? t : '—';
  }

  constructor() {
    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((res) => {
        this.empresas.set(res.data);
      });
      this.empresaControl.valueChanges.subscribe(() => this.load(1));
    }
    this.load(1);

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.load(1));
    this.statusControl.valueChanges.subscribe(() => this.load(1));
    this.desdeControl.valueChanges.subscribe(() => this.load(1));
    this.hastaControl.valueChanges.subscribe(() => this.load(1));
  }

  load(page: number) {
    this.loading.set(true);
    this.api
      .empleados(
        this.empresaControl.value || undefined,
        this.searchControl.value || undefined,
        page,
        this.statusControl.value || 'todos',
        this.fmtDate(this.desdeControl.value),
        this.fmtDate(this.hastaControl.value)
      )
      .subscribe({
        next: (res) => {
          this.empleados.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    this.load(event.pageIndex + 1);
  }

  openForm(empleado?: Empleado) {
    const empresaId = this.currentEmpresaId() ?? empleado?.empresa_id;
    if (!empresaId) {
      this.snack.open(
        'Selecciona una empresa en el filtro para crear el empleado',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId, empleado },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  private fmtDate(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
