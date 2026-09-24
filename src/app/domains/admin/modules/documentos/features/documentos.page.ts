import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { NotificationsService } from '@/app/core/notifications/notifications.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Documento, DocumentoTipo } from '@/app/models/empleado.model';
import { Persona } from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../components/documento-upload.dialog';
import { DocumentoEditDialog } from '../components/documento-edit.dialog';

const ESTATUS_LABEL: Record<string, string> = {
  recibido: 'Recibido',
  en_revision: 'En revisión',
  rechazado: 'Rechazado',
};
const ESTATUS_CLASS: Record<string, string> = {
  recibido: 'bg-emerald-50 text-emerald-700',
  en_revision: 'bg-amber-50 text-amber-700',
  rechazado: 'bg-red-50 text-red-700',
};

@Component({
  selector: 'documentos-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIcon,
    MatProgressSpinner,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTooltipModule,
    DatePipe,
    NgClass,
    PageHeader,
    SearchableSelect,
  ],
  templateUrl: './documentos.page.html',
})
export default class DocumentosPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private notifications = inject(NotificationsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  protected documentos = signal<Documento[]>([]);
  protected clientes = signal<{ key: string; nombre: string }[]>([]);
  protected tipos = signal<DocumentoTipo[]>([]);
  protected loading = signal(false);
  protected clienteControl = new FormControl<string | null>(null);
  protected searchControl = new FormControl('');
  protected tipoControl = new FormControl<number | null>(null);
  protected searchTerm = signal('');
  protected tipoSel = signal<number | null>(null);
  protected page = signal(1);
  protected pageSize = signal(25);
  protected total = signal(0);
  protected ownerId = signal<{ empresa_id?: number; persona_id?: number; all?: boolean } | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();
  // En modo "todos" el admin ve el listado pero no puede subir (no hay owner claro)
  protected canUpload = () => !!this.ownerId() && !this.ownerId()!.all;

  constructor() {
    const user = this.credentials.user;

    this.notifications.realtimeEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        if (notification.tipo === 'documento') {
          this.loadCurrent(this.page());
        }
      });

    this.api.documentoTipos().subscribe((res) => this.tipos.set(res.data));
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((v) => {
        this.searchTerm.set(v || '');
        this.loadCurrent(1);
      });
    this.tipoControl.valueChanges.subscribe((v) => {
      this.tipoSel.set(v);
      this.loadCurrent(1);
    });

    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((res) => {
        this.clientes.set(
          res.data.map((e) => ({ key: `e:${e.id}`, nombre: e.razon_social }))
        );
      });
      this.api.personas({ page: 1, per_page: 500 }).subscribe((res) => {
        this.clientes.update((list) => [
          ...list,
          ...res.data.map((p: Persona) => ({
            key: `p:${p.id}`,
            nombre: `${[p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ')} (independiente)`,
          })),
        ]);
      });
      this.clienteControl.valueChanges.subscribe((key) => {
        if (!key) {
          this.ownerId.set({ all: true });
          this.load({ all: true });
        } else {
          const [kind, id] = key.split(':');
          const owner =
            kind === 'e' ? { empresa_id: Number(id) } : { persona_id: Number(id) };
          this.ownerId.set(owner);
          this.load(owner);
        }
      });
      this.ownerId.set({ all: true });
      this.clienteControl.setValue(null);
    } else if (user?.empresa?.id) {
      this.ownerId.set({ empresa_id: user.empresa.id });
      this.load({ empresa_id: user.empresa.id });
    } else if (user?.persona?.id) {
      this.ownerId.set({ persona_id: user.persona.id });
      this.load({ persona_id: user.persona.id });
    }
  }

  private loadCurrent(page = 1) {
    const owner = this.ownerId();
    if (owner) this.load(owner, page);
  }

  load(
    owner: { empresa_id?: number; persona_id?: number; all?: boolean },
    page = 1
  ) {
    this.loading.set(true);
    this.page.set(page);
    const ownerParams: Record<string, number | string | undefined> = owner.all
      ? { all: 1 }
      : { empresa_id: owner.empresa_id, persona_id: owner.persona_id };
    const params: Record<string, number | string | undefined> = {
      ...ownerParams,
      page,
      per_page: this.pageSize(),
      search: this.searchTerm() || undefined,
      tipo_id: this.tipoSel() ?? undefined,
    };
    this.api.documentos(params).subscribe({
      next: (res) => {
        if (!res.data.length && res.total > 0 && page > 1) {
          this.load(owner, page - 1);
          return;
        }
        this.documentos.set(res.data);
        this.total.set(res.total);
        this.page.set(res.page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    const owner = this.ownerId();
    if (owner) this.load(owner, event.pageIndex + 1);
  }

  openUpload(tipoId?: number) {
    const owner = this.ownerId();
    if (!owner) return;

    this.dialog
      .open(DocumentoUploadDialog, {
        width: '520px',
        maxWidth: '95vw',
        data: { ...owner, tipo_id: tipoId },
      })
      .afterClosed()
      .subscribe((uploaded) => {
        if (uploaded) this.load(owner);
      });
  }

  openEdit(doc: Documento) {
    this.dialog
      .open(DocumentoEditDialog, {
        width: '520px',
        maxWidth: '95vw',
        data: doc,
      })
      .afterClosed()
      .subscribe((saved) => {
        const owner = this.ownerId();
        if (saved && owner) this.load(owner);
      });
  }

  download(doc: Documento) {
    this.api.downloadDocumento(doc.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  remove(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"? Se borrará el archivo y no se podrá recuperar.`)) {
      return;
    }

    this.api.deleteDocumento(doc.id).subscribe({
      next: () => {
        this.snackBar.open('Documento eliminado', 'Cerrar', { duration: 2500 });
        const owner = this.ownerId();
        if (owner) this.load(owner);
      },
      error: () =>
        this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  estatusLabel = (e?: string | null) => ESTATUS_LABEL[e ?? ''] || 'Recibido';
  estatusClass = (e?: string | null) =>
    ESTATUS_CLASS[e ?? ''] || 'bg-emerald-50 text-emerald-700';

  iconFor(d: Documento): string {
    const ext = (d.nombre.split('.').pop() || '').toLowerCase();
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'file-spreadsheet';
    if (['doc', 'docx'].includes(ext)) return 'file-text';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return 'file-text';
  }

  formatSize(bytes: number): string {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }
}
