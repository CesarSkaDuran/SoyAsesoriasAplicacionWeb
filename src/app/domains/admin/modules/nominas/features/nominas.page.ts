import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Nomina } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { NominaFormDialog } from '../components/nomina-form.dialog';
import { NominaParametrosDialog } from '../components/nomina-parametros.dialog';

@Component({
  selector: 'nominas-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    CurrencyPipe,
    PageHeader,
    SearchableSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nominas.page.html',
})
export default class NominasPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);

  // Mismo orden de columnas de la tabla vieja
  protected columns = [
    'periodo',
    'empleados',
    'salarios',
    'o_ingreso',
    'pago_ss',
    'otros',
    'deducciones',
    'total_pagar',
    'status',
    'acciones',
  ];
  protected nominas = signal<Nomina[]>([]);
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(false);
  protected empresaControl = new FormControl<number | null>(null);
  protected statusControl = new FormControl('');
  protected vigenciaActual = new Date().getFullYear();
  protected isAdmin = () => this.credentials.isAdmin();

  constructor() {
    const user = this.credentials.user;

    if (this.isAdmin()) {
      this.api.empresas('', 1, 1000).subscribe((res) => {
        this.empresas.set(res.data);
      });
      this.empresaControl.valueChanges.subscribe(() => this.load(undefined, 1));
      this.load(undefined, 1);
    } else if (user?.empresa?.id) {
      this.load(user.empresa.id, 1);
    }
    this.statusControl.valueChanges.subscribe(() => this.load(undefined, 1));
  }

  openParametros() {
    this.dialog.open(NominaParametrosDialog, {
      width: '820px',
      maxWidth: '96vw',
      data: new Date().getFullYear(),
    });
  }

  openForm() {
    this.dialog
      .open(NominaFormDialog, { width: '480px', data: {} })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.load(undefined, 1);
      });
  }

  load(empresaId: number | undefined, page: number) {
    this.loading.set(true);
    const id = empresaId ?? this.empresaControl.value ?? undefined;
    this.api
      .nominas(id || undefined, page, this.statusControl.value || undefined)
      .subscribe({
        next: (res) => {
          this.nominas.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    const id = this.isAdmin()
      ? (this.empresaControl.value || undefined)
      : this.credentials.user?.empresa?.id;
    this.load(id ?? undefined, event.pageIndex + 1);
  }
}
