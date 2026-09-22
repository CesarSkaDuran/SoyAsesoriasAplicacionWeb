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
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Independientes"
        [subtitle]="total() + ' trabajadores independientes'"
      >
        <button
          matButton="filled"
          (click)="openCreate()"
        >
          <mat-icon svgIcon="plus" />
          Nuevo independiente
        </button>
      </page-header>

      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field
          class="w-72"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-icon svgIcon="search" matIconPrefix />
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Nombre o documento"
          />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option value="">Todos</mat-option>
            <mat-option value="activo">Activo</mat-option>
            <mat-option value="prospecto">Prospecto</mat-option>
            <mat-option value="inactivo">Inactivo</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Fecha inicial</mat-label>
          <input matInput [matDatepicker]="dpDesde" [formControl]="desdeControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpDesde" />
          <mat-datepicker #dpDesde />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Fecha final</mat-label>
          <input matInput [matDatepicker]="dpHasta" [formControl]="hastaControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpHasta" />
          <mat-datepicker #dpHasta />
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <mat-spinner diameter="48" />
        </div>
      } @else {
        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table
            mat-table
            [dataSource]="personas()"
            class="w-full"
          >
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let p">
                <a
                  [routerLink]="['/admin/independientes', p.id]"
                  class="font-medium text-blue-700 hover:underline"
                >
                  {{ nombreCompleto(p) }}
                </a>
              </td>
            </ng-container>
            <ng-container matColumnDef="documento">
              <th mat-header-cell *matHeaderCellDef>Documento</th>
              <td mat-cell *matCellDef="let p">{{ p.tipo_documento }} {{ p.num_documento }}</td>
            </ng-container>
            <ng-container matColumnDef="telefono">
              <th mat-header-cell *matHeaderCellDef>Teléfono</th>
              <td mat-cell *matCellDef="let p">{{ p.telefono || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let p">{{ p.email || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="ciudad">
              <th mat-header-cell *matHeaderCellDef>Ciudad</th>
              <td mat-cell *matCellDef="let p">{{ p.ciudad_nombre || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="registro">
              <th mat-header-cell *matHeaderCellDef>Registro</th>
              <td mat-cell *matCellDef="let p">{{ p.created_at | date: 'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                  [class.bg-green-500]="p.status === 'activo'"
                  [class.bg-neutral-400]="p.status !== 'activo'"
                >
                  {{ p.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let p">
                <button matIconButton [routerLink]="['/admin/independientes', p.id]" title="Ver detalle">
                  <mat-icon svgIcon="eye" />
                </button>
                <button matIconButton (click)="openEdit(p)" title="Editar">
                  <mat-icon svgIcon="pencil" />
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
            ></tr>
          </table>

          @if (!personas().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay independientes registrados
            </div>
          }

          <mat-paginator
            [length]="total()"
            [pageSize]="25"
            [pageIndex]="page() - 1"
            (page)="onPage($event)"
          />
        </div>
      }
    </div>
  `,
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
