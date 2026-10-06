import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Empleado } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { EmpleadoFormDialog } from '../components/empleado-form.dialog';
import { RetirarLoteDialog } from '../components/retirar-lote.dialog';
import { RecontratarDialog } from '../components/recontratar.dialog';

const TIPOS_CONTRATO: Record<string, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término fijo',
  obra_labor: 'Obra o labor',
  aprendizaje: 'Aprendizaje',
  prestacion: 'Prestación de servicios',
  prestacion_servicios: 'Prestación de servicios',
  otro: 'Otro',
};

@Component({
  selector: 'empleados-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    CurrencyPipe,
    NgClass,
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
  private route = inject(ActivatedRoute);

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

  // Selección múltiple para retiro en lote (solo admin)
  protected seleccion = signal<Set<number>>(new Set());
  protected seleccionados = computed(() => this.seleccion().size);

  protected toggleSeleccion(e: Empleado) {
    this.seleccion.update((set) => {
      const next = new Set(set);
      if (next.has(e.id)) next.delete(e.id);
      else next.add(e.id);
      return next;
    });
  }

  protected todosSeleccionados(): boolean {
    const elegibles = this.empleados().filter((e) => e.status !== 'retirado');
    return elegibles.length > 0 && elegibles.every((e) => this.seleccion().has(e.id));
  }

  protected toggleTodos() {
    this.seleccion.update((set) => {
      const next = new Set(set);
      if (this.todosSeleccionados()) {
        for (const e of this.empleados()) next.delete(e.id);
      } else {
        for (const e of this.empleados()) {
          if (e.status !== 'retirado') next.add(e.id);
        }
      }
      return next;
    });
  }

  protected nombreEmpleado(e: Empleado): string {
    return [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  protected retirarSeleccionados() {
    const ids = [...this.seleccion()];
    if (!ids.length) return;
    const seleccionados = this.empleados().filter((e) => this.seleccion().has(e.id));

    this.dialog
      .open(RetirarLoteDialog, {
        width: '520px',
        data: { empleados: seleccionados.map((e) => ({ id: e.id, nombre: this.nombreEmpleado(e) })) },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.seleccion.set(new Set());
          this.load(1);
        }
      });
  }

  protected openRecontratar(empleado: Empleado) {
    if (!this.isAdmin() || empleado.status !== 'retirado') return;
    this.dialog.open(RecontratarDialog, {
      width: '640px', maxWidth: '95vw', data: { empleado },
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.seleccion.set(new Set());
        this.load(1);
      }
    });
  }

  protected currentEmpresaId(): number | null {
    return (
      this.empresaControl.value ?? this.credentials.user?.empresa?.id ?? null
    );
  }

  protected tipoContrato(t?: string): string {
    return t ? TIPOS_CONTRATO[t] ?? t : '—';
  }

  // Badge de estado (patrón auditorías)
  protected estadoColor(status?: string): string {
    switch (status) {
      case 'retirado':
        return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
      case 'suspendido':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      default:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    }
  }

  constructor() {
    // Permite llegar prefiltrado desde el detalle de empresa (?empresa_id=)
    const empresaParam = Number(this.route.snapshot.queryParamMap.get('empresa_id'));
    if (empresaParam) this.empresaControl.setValue(empresaParam, { emitEvent: false });
    const estadoParam = this.route.snapshot.queryParamMap.get('status');
    if (estadoParam && ['activo', 'retirado', 'suspendido', 'todos'].includes(estadoParam)) {
      this.statusControl.setValue(estadoParam, { emitEvent: false });
    }

    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((res) => {
        this.empresas.set(res.data);
      });
      this.empresaControl.valueChanges.subscribe(() => this.load(1));
    }
    this.load(1);

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => { this.seleccion.set(new Set()); this.load(1); });
    this.statusControl.valueChanges.subscribe(() => { this.seleccion.set(new Set()); this.load(1); });
    this.desdeControl.valueChanges.subscribe(() => { this.seleccion.set(new Set()); this.load(1); });
    this.hastaControl.valueChanges.subscribe(() => { this.seleccion.set(new Set()); this.load(1); });
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
    this.seleccion.set(new Set());
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
