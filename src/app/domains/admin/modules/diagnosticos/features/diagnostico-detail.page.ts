import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import {
  Diagnostico,
  DiagnosticoDocumento,
  DiagnosticoDocConfig,
  DiagnosticoDocEstado,
  DiagnosticoEntregable,
  DiagnosticoPregunta,
  Usuario,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { DiagnosticoFormDialog } from '../components/diagnostico-form.dialog';
import { RechazoComentarioDialog } from '../components/rechazo-comentario.dialog';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  logrado: 'Logrado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-500 text-white',
  en_progreso: 'bg-sky-500 text-white',
  logrado: 'bg-emerald-500 text-white',
  suspendido: 'bg-violet-500 text-white',
  cancelado: 'bg-neutral-400 text-white',
};
const DOC_ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  revisar: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  renovar: 'Renovar',
};
const DOC_ESTADO_CLASS: Record<string, string> = {
  pendiente: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  revisar: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rechazado: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  renovar: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

interface DocItem {
  config: DiagnosticoDocConfig;
  archivos: DiagnosticoDocumento[];
}

@Component({
  selector: 'diagnostico-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTabsModule,
    MatIcon,
    MatProgressSpinner,
    DatePipe,
  ],
  templateUrl: './diagnostico-detail.page.html',
  styleUrl: './diagnostico-detail.page.css',
})
export default class DiagnosticoDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  creds = inject(CredentialsService);

  id = Number(this.route.snapshot.paramMap.get('id'));
  diag = signal<Diagnostico | null>(null);
  preguntas = signal<DiagnosticoPregunta[]>([]);
  documentos = signal<DocItem[]>([]);
  informeHtml = signal('');
  loading = signal(true);
  savingRespuestas = signal(false);
  savingInforme = signal(false);
  uploadingId = signal<number | null>(null);

  isAdmin = () => this.creds.isAdmin();
  estados = ['pendiente', 'en_progreso', 'logrado', 'suspendido', 'cancelado'];
  /** Estados de revisión configurados en Diagnósticos → Configurar. */
  docEstados = signal<DiagnosticoDocEstado[]>([]);

  /** Entregables: documentos finales que el staff publica al cliente. */
  entregables = signal<DiagnosticoEntregable[]>([]);
  entregableTitulo = new FormControl('');
  uploadingEntregable = signal(false);
  exporting = signal(false);

  entrevistaForm = this.fb.group<Record<string, FormControl<string | null>>>({});

  duracion = computed(() => {
    const d = this.diag();
    if (!d) return 0;
    const a = new Date(d.fecha_inicio).getTime();
    const b = new Date(d.fecha_fin).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  });

  constructor() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.api.diagnostico(this.id).subscribe({
      next: (d) => {
        this.diag.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadEntrevista();
    this.loadDocumentos();
    this.loadEntregables();
    this.api.diagnosticoDocEstados().subscribe({
      next: (r) => this.docEstados.set(r.data),
      error: () => {},
    });
    this.api.diagnosticoInforme(this.id).subscribe((r) => {
      this.informeHtml.set(r.contenido_html);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('[contenteditable].informe-content');
        if (el && r.contenido_html) el.innerHTML = r.contenido_html;
      });
    });
  }

  loadEntrevista() {
    this.api.diagnosticoEntrevista(this.id).subscribe((r) => {
      this.preguntas.set(r.preguntas);
      const group: Record<string, FormControl<string | null>> = {};
      for (const p of r.preguntas) {
        group['p_' + p.id] = new FormControl<string | null>(p.respuesta ?? '');
      }
      this.entrevistaForm = this.fb.group(group);
    });
  }

  loadDocumentos() {
    this.api.diagnosticoDocumentos(this.id).subscribe((r) => this.documentos.set(r.documentos));
  }

  loadEntregables() {
    this.api.diagnosticoEntregables(this.id).subscribe({
      next: (r) => this.entregables.set(r.data),
      error: () => {},
    });
  }

  estadoLabel = (s: string) => ESTADO_LABEL[s] || s;
  estadoColor = (s: string) => ESTADO_COLOR[s] || 'bg-neutral-400 text-white';
  // Etiqueta: primero la configurada por el admin, luego el mapa base
  docEstadoLabel = (s: string) =>
    this.docEstados().find((e) => e.value === s)?.label || DOC_ESTADO_LABEL[s] || s;
  docEstadoClass = (s: string) => DOC_ESTADO_CLASS[s] || DOC_ESTADO_CLASS['pendiente'];

  setEstado(estado: string) {
    this.api.updateDiagnosticoEstado(this.id, estado).subscribe({
      next: () => {
        this.diag.update((d) => (d ? { ...d, estado: estado as Diagnostico['estado'] } : d));
        this.snack.open('Estado actualizado', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Sin permiso para cambiar el estado', 'Cerrar', { duration: 3000 }),
    });
  }

  saveRespuestas() {
    this.savingRespuestas.set(true);
    const raw = this.entrevistaForm.getRawValue();
    const respuestas: Record<number, unknown> = {};
    for (const p of this.preguntas()) {
      const v = raw['p_' + p.id];
      if (v !== undefined && v !== null && v !== '') respuestas[p.id] = v;
    }
    this.api.saveRespuestas(this.id, respuestas).subscribe({
      next: () => {
        this.savingRespuestas.set(false);
        this.snack.open('Respuestas guardadas', 'OK', { duration: 2000 });
        this.api.diagnostico(this.id).subscribe((d) => this.diag.set(d));
      },
      error: () => {
        this.savingRespuestas.set(false);
        this.snack.open('No se pudieron guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  acceptFor(tipos: string | null): string {
    return tipos ? tipos.split(',').map(t => '.' + t.trim()).join(',') : '';
  }

  uploadDoc(config: DiagnosticoDocConfig, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingId.set(config.id);
    this.api.uploadDiagnosticoDoc(this.id, config.id, file).subscribe({
      next: () => {
        this.uploadingId.set(null);
        this.snack.open('Documento cargado', 'OK', { duration: 2000 });
        this.loadDocumentos();
        this.api.diagnostico(this.id).subscribe((d) => this.diag.set(d));
      },
      error: (e) => {
        this.uploadingId.set(null);
        input.value = '';
        this.snack.open(e?.error?.message || 'No se pudo cargar', 'Cerrar', { duration: 3500 });
      },
    });
  }

  /** Máximo de archivos por documento: config o 5 (tope global del API). */
  maxFor(config: DiagnosticoDocConfig): number {
    return Math.min(Math.max(Number(config.maximo_archivos) || 5, 1), 5);
  }

  revisar(doc: DiagnosticoDocumento, estado: DiagnosticoDocEstado) {
    if (estado.requiere_comentario) {
      this.dialog
        .open(RechazoComentarioDialog, {
          width: '420px',
          data: { titulo: doc.nombre_original || '', accion: estado.label },
        })
        .afterClosed()
        .subscribe((comentarios) => {
          if (comentarios) this.doRevisar(doc, estado.value, comentarios);
        });
      return;
    }
    this.doRevisar(doc, estado.value);
  }

  private doRevisar(doc: DiagnosticoDocumento, estado: string, comentarios?: string) {
    this.api.revisarDiagnosticoDoc(doc.id, estado, comentarios).subscribe({
      next: () => {
        this.snack.open('Revisión registrada', 'OK', { duration: 2000 });
        this.loadDocumentos();
      },
      error: () => this.snack.open('No se pudo revisar', 'Cerrar', { duration: 3000 }),
    });
  }

  removeDoc(doc: DiagnosticoDocumento) {
    if (!confirm(`¿Eliminar "${doc.nombre_original}"?`)) return;
    this.api.deleteDiagnosticoDoc(doc.id).subscribe({
      next: () => this.loadDocumentos(),
      error: () => this.snack.open('No se pudo eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  downloadDoc(doc: DiagnosticoDocumento) {
    this.http
      .get(this.api.diagnosticoDocDownloadUrl(doc.id).replace(/^\/api/, ''), { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      });
  }

  // ── Entregables ──────────────────────────────────────────────────────────

  uploadEntregable(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingEntregable.set(true);
    this.api.uploadDiagnosticoEntregable(this.id, file, this.entregableTitulo.value || undefined).subscribe({
      next: () => {
        this.uploadingEntregable.set(false);
        this.entregableTitulo.reset('');
        this.snack.open('Entregable publicado — el cliente fue notificado', 'OK', { duration: 2500 });
        this.loadEntregables();
      },
      error: (e) => {
        this.uploadingEntregable.set(false);
        input.value = '';
        this.snack.open(e?.error?.message || 'No se pudo publicar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  downloadEntregable(e: DiagnosticoEntregable) {
    this.http
      .get(this.api.diagnosticoEntregableDownloadUrl(e.id).replace(/^\/api/, ''), { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = e.nombre_original || e.titulo || 'entregable';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  removeEntregable(e: DiagnosticoEntregable) {
    if (!confirm(`¿Quitar el entregable "${e.titulo || e.nombre_original}"?`)) return;
    this.api.deleteDiagnosticoEntregable(e.id).subscribe({
      next: () => this.loadEntregables(),
      error: () => this.snack.open('No se pudo quitar', 'Cerrar', { duration: 3000 }),
    });
  }

  exportEntrevista() {
    this.exporting.set(true);
    this.api.exportDiagnosticoEntrevista(this.id).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `entrevista-diagnostico-${this.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting.set(false);
        this.snack.open('No se pudo exportar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  exec(cmd: string) {
    document.execCommand(cmd);
  }

  block(tag: string) {
    document.execCommand('formatBlock', false, tag);
  }

  saveInforme(html: string) {
    this.savingInforme.set(true);
    this.api.saveDiagnosticoInforme(this.id, html).subscribe({
      next: () => {
        this.savingInforme.set(false);
        this.informeHtml.set(html);
        this.snack.open('Informe guardado', 'OK', { duration: 2000 });
      },
      error: () => {
        this.savingInforme.set(false);
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  openEdit() {
    const d = this.diag();
    if (!d) return;
    this.dialog
      .open(DiagnosticoFormDialog, {
        width: '720px',
        data: { diagnostico: d },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.loadAll());
  }

  // Los diagnósticos no se eliminan: se suspenden conservando el registro.
  toggleSuspender() {
    const d = this.diag();
    if (!d) return;
    const suspendido = d.estado === 'suspendido';
    if (!suspendido && !confirm(`¿Suspender "${d.nombre}"? El registro se conserva y puedes reactivarlo después.`)) return;
    this.setEstado(suspendido ? 'pendiente' : 'suspendido');
  }
}
