import { DatePipe } from '@angular/common';
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
import { PageHeader } from '@/app/core/ui/page-header';
import { Persona } from '@/app/models/negocio.model';
import { PersonaFormDialog } from '../components/persona-form.dialog';

@Component({
  selector: 'independientes-page',
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
    DatePipe,
    PageHeader,
  ],
  templateUrl: './independientes.page.html',
})
export default class IndependientesPage {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  personas = signal<Persona[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);
  columns = ['nombre', 'documento', 'telefono', 'email', 'ciudad', 'registro', 'status', 'acciones'];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .personas({
        search: this.searchControl.value || undefined,
        status: this.statusControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.personas.set(r.data);
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

  nombreCompleto(p: Persona) {
    return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  openCreate() {
    this.dialog
      .open(PersonaFormDialog, { width: '720px', maxWidth: '95vw', data: {} })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(persona: Persona) {
    this.dialog
      .open(PersonaFormDialog, {
        width: '720px',
        maxWidth: '95vw',
        data: { persona },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(value: Date | null): string | undefined {
    return value ? value.toISOString().slice(0, 10) : undefined;
  }
}
