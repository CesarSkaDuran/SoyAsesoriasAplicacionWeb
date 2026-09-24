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
  DiagnosticoPregunta,
  Usuario,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { DiagnosticoFormDialog } from '../components/diagnostico-form.dialog';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  logrado: 'Logrado',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-500',
  en_progreso: 'bg-sky-500',
  logrado: 'bg-emerald-500',
  cancelado: 'bg-neutral-400',
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
  documento: DiagnosticoDocumento | null;
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
  estados = ['pendiente', 'en_progreso', 'logrado', 'cancelado'];
  docEstados = [
    { value: 'aprobado', label: 'Aprobar' },
    { value: 'revisar', label: 'En revisión' },
    { value: 'rechazado', label: 'Rechazar' },
    { value: 'renovar', label: 'Solicitar renovación' },
    { value: 'pendiente', label: 'Pendiente' },
  ];

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

  estadoLabel = (s: string) => ESTADO_LABEL[s] || s;
  estadoColor = (s: string) => ESTADO_COLOR[s] || 'bg-neutral-400';
  docEstadoLabel = (s: string) => DOC_ESTADO_LABEL[s] || s;
  docEstadoClass = (s: string) => DOC_ESTADO_CLASS[s] || DOC_ESTADO_CLASS['pendiente'];

  setEstado(estado: string) {
    this.api.updateDiagnosticoEstado(this.id, estado).subscribe(() => {
      this.diag.update((d) => (d ? { ...d, estado: estado as Diagnostico['estado'] } : d));
      this.snack.open('Estado actualizado', 'OK', { duration: 2000 });
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

  revisar(doc: DiagnosticoDocumento, estado: string) {
    this.api.revisarDiagnosticoDoc(doc.id, estado).subscribe({
      next: () => {
        this.snack.open('Revisión registrada', 'OK', { duration: 2000 });
        this.loadDocumentos();
      },
      error: () => this.snack.open('No se pudo revisar', 'Cerrar', { duration: 3000 }),
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

  remove() {
    const d = this.diag();
    if (!d || !confirm(`¿Eliminar definitivamente "${d.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.api.deleteDiagnostico(d.id).subscribe(() => {
      history.back();
    });
  }
}
