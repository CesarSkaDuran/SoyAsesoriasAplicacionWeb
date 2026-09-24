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
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Empresa } from '@/app/models/user.model';
import { EmpresaFormDialog } from '../components/empresa-form.dialog';

@Component({
  selector: 'empresas-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    PageHeader,
  ],
  templateUrl: './empresas.page.html',
})
export default class EmpresasPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);

  protected columns = [
    'nombre',
    'nit',
    'contacto',
    'rep',
    'tel',
    'empleados',
    'estado',
    'acciones',
  ];
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(true);
  protected searchControl = new FormControl('');
  protected statusControl = new FormControl('');
  protected desdeControl = new FormControl<Date | null>(null);
  protected hastaControl = new FormControl<Date | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.load(1));
    this.statusControl.valueChanges.subscribe(() => this.load(1));
    this.desdeControl.valueChanges.subscribe(() => this.load(1));
    this.hastaControl.valueChanges.subscribe(() => this.load(1));

    this.load(1);
  }

  load(page: number) {
    this.loading.set(true);
    this.api
      .empresas(
        this.searchControl.value || undefined,
        page,
        20,
        this.statusControl.value || undefined,
        this.fmt(this.desdeControl.value),
        this.fmt(this.hastaControl.value)
      )
      .subscribe({
        next: (res) => {
          this.empresas.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    this.load(event.pageIndex + 1);
  }

  openCreate() {
    this.dialog
      .open(EmpresaFormDialog, { width: '900px', maxWidth: '95vw', data: {} })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  openEdit(empresa: Empresa) {
    this.dialog
      .open(EmpresaFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresa },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  private fmt(value: Date | null): string | undefined {
    return value ? value.toISOString().slice(0, 10) : undefined;
  }
}
