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
  templateUrl: './configuracion.page.html',
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
