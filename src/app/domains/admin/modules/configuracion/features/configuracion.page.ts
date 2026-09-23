import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import {
  MaestroField,
  MaestroMeta,
} from '@/app/models/empleado.model';
import {
  MaestroDialogData,
  MaestroFormDialog,
} from '../components/maestro-form.dialog';

@Component({
  selector: 'configuracion-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RouterLink,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Configuración"
        subtitle="Administra los listados que alimentan los selectores del sistema"
      >
        <a matButton="outlined" routerLink="/admin/configuracion/auditorias">
          <mat-icon svgIcon="list-check" />
          Auditorías
        </a>
      </page-header>

      <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <!-- Selector compacto para tablet y móvil -->
        <div class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm xl:hidden">
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <mat-icon svgIcon="database" class="!size-5 text-brand-medium" />
            Selecciona un maestro
          </div>
          <mat-form-field class="w-full" appearance="outline" subscriptSizing="dynamic">
            <mat-label>Listado de configuración</mat-label>
            <mat-select
              [value]="selected()?.key"
              (selectionChange)="selectByKey($event.value)"
            >
              @for (m of maestros(); track m.key) {
                <mat-option [value]="m.key">
                  {{ m.label }} · {{ m.total }} registros
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Navegación de maestros -->
        <aside class="sticky top-6 hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm xl:block">
          <div class="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <div class="flex items-center gap-3">
              <span class="flex size-10 items-center justify-center rounded-xl bg-brand-medium text-white shadow-sm">
                <mat-icon svgIcon="database" class="!size-5" />
              </span>
              <div>
                <div class="font-semibold text-slate-800">Maestros</div>
                <div class="text-xs text-slate-500">{{ maestros().length }} listados disponibles</div>
              </div>
            </div>
          </div>

          <div class="max-h-[calc(100vh-250px)] overflow-y-auto py-2">
            @for (m of maestros(); track m.key) {
              <button
                type="button"
                class="group flex w-full items-center gap-3 border-l-4 border-l-transparent px-4 py-3 text-left transition-colors hover:bg-slate-50"
                [class.!border-l-brand-medium]="selected()?.key === m.key"
                [class.bg-blue-50]="selected()?.key === m.key"
                (click)="select(m)"
              >
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white"
                  [class.!bg-brand-medium]="selected()?.key === m.key"
                  [class.!text-white]="selected()?.key === m.key"
                >
                  <mat-icon [svgIcon]="m.icon" class="!size-4.5" />
                </span>
                <span
                  class="min-w-0 flex-1 truncate text-sm font-medium text-slate-600"
                  [class.!text-brand-medium]="selected()?.key === m.key"
                >
                  {{ m.label }}
                </span>
                <span
                  class="min-w-7 rounded-full bg-slate-100 px-2 py-1 text-center text-[11px] font-semibold text-slate-500"
                  [class.!bg-white]="selected()?.key === m.key"
                  [class.!text-brand-medium]="selected()?.key === m.key"
                >
                  {{ m.total }}
                </span>
              </button>
            }
          </div>
        </aside>

        <!-- Contenido del maestro seleccionado -->
        <section class="min-w-0">
          @if (selected(); as meta) {
            <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-medium">
                      <mat-icon [svgIcon]="meta.icon" class="!size-5" />
                    </span>
                    <div class="min-w-0">
                      <h2 class="truncate text-xl font-bold text-slate-800">
                        {{ meta.label }}
                      </h2>
                      <p class="mt-0.5 text-sm text-slate-500">
                        {{ total() }} registros configurados
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <mat-form-field
                      appearance="outline"
                      class="w-full sm:w-72"
                      subscriptSizing="dynamic"
                    >
                      <mat-icon svgIcon="search" matIconPrefix />
                      <input
                        matInput
                        placeholder="Buscar en {{ meta.label.toLowerCase() }}"
                        [formControl]="searchCtrl"
                      />
                    </mat-form-field>
                    <button matButton="filled" class="!h-12 sm:!px-5" (click)="openForm()">
                      <mat-icon svgIcon="plus" />
                      Nuevo registro
                    </button>
                  </div>
                </div>
              </div>

              @if (loading()) {
                <div class="flex min-h-72 flex-col items-center justify-center gap-3">
                  <mat-spinner diameter="40" />
                  <span class="text-sm text-slate-500">Cargando registros…</span>
                </div>
              } @else if (items().length) {
                <div class="overflow-x-auto">
                  <table mat-table [dataSource]="items()" class="w-full min-w-[620px]">
                    <ng-container matColumnDef="id">
                      <th mat-header-cell *matHeaderCellDef class="!w-20 !pl-6">ID</th>
                      <td mat-cell *matCellDef="let row" class="!pl-6 font-mono text-xs text-slate-500">
                        #{{ row.id }}
                      </td>
                    </ng-container>

                    @for (field of meta.fields; track field.key) {
                      <ng-container [matColumnDef]="field.key">
                        <th mat-header-cell *matHeaderCellDef>
                          {{ field.label }}
                        </th>
                        <td mat-cell *matCellDef="let row" class="text-slate-700">
                          @switch (field.type) {
                            @case ('boolean') {
                              <span
                                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                                [class.bg-emerald-50]="row[field.key]"
                                [class.text-emerald-700]="row[field.key]"
                                [class.bg-slate-100]="!row[field.key]"
                                [class.text-slate-500]="!row[field.key]"
                              >
                                <span
                                  class="size-1.5 rounded-full"
                                  [class.bg-emerald-500]="row[field.key]"
                                  [class.bg-slate-400]="!row[field.key]"
                                ></span>
                                {{ row[field.key] ? 'Activo' : 'Inactivo' }}
                              </span>
                            }
                            @case ('select') {
                              {{ displayFor(field, row) || '—' }}
                            }
                            @case ('number') {
                              @if (field.key === 'valor') {
                                <span class="font-semibold text-slate-800">
                                  {{ row[field.key] | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                                </span>
                              } @else {
                                {{ row[field.key] ?? '—' }}
                              }
                            }
                            @default {
                              <span [class.font-medium]="field.key === 'nombre'">
                                {{ row[field.key] || '—' }}
                              </span>
                            }
                          }
                        </td>
                      </ng-container>
                    }

                    <ng-container matColumnDef="acciones">
                      <th mat-header-cell *matHeaderCellDef class="!pr-6 !text-right">
                        Opciones
                      </th>
                      <td mat-cell *matCellDef="let row" class="!pr-6 !text-right">
                        <div class="flex justify-end gap-1">
                          <button
                            matIconButton
                            title="Editar registro"
                            class="!text-slate-500 hover:!bg-blue-50 hover:!text-brand-medium"
                            (click)="openForm(row)"
                          >
                            <mat-icon svgIcon="pencil" />
                          </button>
                          <button
                            matIconButton
                            title="Eliminar registro"
                            class="!text-slate-400 hover:!bg-red-50 hover:!text-red-600"
                            (click)="remove(row)"
                          >
                            <mat-icon svgIcon="trash" />
                          </button>
                        </div>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="columns(meta)" class="!h-12 !bg-slate-50/80"></tr>
                    <tr
                      mat-row
                      *matRowDef="let row; columns: columns(meta)"
                      class="!h-14 transition-colors hover:!bg-slate-50/70"
                    ></tr>
                  </table>
                </div>

                <div class="border-t border-slate-100 px-2">
                  <mat-paginator
                    [length]="total()"
                    [pageSize]="perPage"
                    [pageSizeOptions]="[10, 25, 50, 100]"
                    (page)="onPage($event)"
                    showFirstLastButtons
                  />
                </div>
              } @else {
                <div class="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                  <span class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <mat-icon svgIcon="database" class="!size-7" />
                  </span>
                  <h3 class="font-semibold text-slate-700">No hay registros</h3>
                  <p class="mt-1 max-w-sm text-sm text-slate-500">
                    @if (searchCtrl.value) {
                      No encontramos resultados para “{{ searchCtrl.value }}”.
                    } @else {
                      Crea el primer registro para este maestro.
                    }
                  </p>
                  @if (!searchCtrl.value) {
                    <button matButton="filled" class="!mt-5" (click)="openForm()">
                      <mat-icon svgIcon="plus" />
                      Crear registro
                    </button>
                  }
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export default class ConfiguracionPage implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  maestros = signal<MaestroMeta[]>([]);
  selected = signal<MaestroMeta | null>(null);
  items = signal<Record<string, any>[]>([]);
  total = signal(0);
  loading = signal(false);
  perPage = 25;

  searchCtrl = new FormControl('');

  /** opciones para selects: source -> items */
  optionSources = signal<Record<string, any[]>>({});

  ngOnInit() {
    this.api.maestros().subscribe((m) => {
      this.maestros.set(m);
      if (m.length) this.select(m[0]);
    });

    // precarga de opciones para los campos select
    this.api.catalogos().subscribe((cat) => {
      const lists: Record<string, any[]> = {};
      for (const [k, v] of Object.entries(cat)) if (v) lists[k] = v;
      this.optionSources.update((o) => ({ ...o, ...lists }));
    });
    this.api.empresas(undefined, 1, 500).subscribe((r) => {
      this.optionSources.update((o) => ({ ...o, empresas: r.data }));
    });

    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load(1));
  }

  select(meta: MaestroMeta) {
    this.selected.set(meta);
    this.searchCtrl.setValue('', { emitEvent: false });
    this.load(1);
  }

  selectByKey(key: string) {
    const meta = this.maestros().find((m) => m.key === key);
    if (meta) this.select(meta);
  }

  columns(meta: MaestroMeta): string[] {
    return ['id', ...meta.fields.map((f) => f.key), 'acciones'];
  }

  /** columna de visualizacion para campos select: empresa_id -> empresa_nombre */
  displayFor(field: MaestroField, row: Record<string, any>): string {
    const alias = field.key.replace(/_id$/, '_nombre');
    if (row[alias]) return row[alias];
    const opt = this.optionsFor(field).find((o) => o.value === row[field.key]);
    return opt?.label ?? (row[field.key] ?? '');
  }

  private optionsFor(field: MaestroField): { value: any; label: string }[] {
    if (field.options) return field.options;
    if (!field.source) return [];
    return (this.optionSources()[field.source] ?? []).map((i) => ({
      value: i.id,
      label: i.nombre ?? i.razon_social ?? `#${i.id}`,
    }));
  }

  load(page = 1) {
    const meta = this.selected();
    if (!meta) return;
    this.loading.set(true);
    this.api
      .maestroItems(meta.key, {
        search: this.searchCtrl.value || '',
        page,
        per_page: this.perPage,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    this.perPage = event.pageSize;
    this.load(event.pageIndex + 1);
  }

  openForm(item?: Record<string, any>) {
    const meta = this.selected();
    if (!meta) return;
    const data: MaestroDialogData = {
      meta,
      item,
      options: this.optionSources(),
    };
    this.dialog
      .open(MaestroFormDialog, { width: '640px', maxWidth: '95vw', data })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load(1);
          // refrescar conteos del menu
          this.api.maestros().subscribe((m) => this.maestros.set(m));
        }
      });
  }

  remove(row: Record<string, any>) {
    const meta = this.selected();
    if (!meta) return;
    this.api.deleteMaestroItem(meta.key, row['id']).subscribe({
      next: () => {
        this.snack.open('Registro eliminado', 'OK', { duration: 2500 });
        this.load(1);
        this.api.maestros().subscribe((m) => this.maestros.set(m));
      },
      error: (e) =>
        this.snack.open(
          e?.error?.message || 'No se pudo eliminar',
          'Cerrar',
          { duration: 4000 }
        ),
    });
  }
}
