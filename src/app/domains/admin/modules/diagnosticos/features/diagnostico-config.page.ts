import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { DiagnosticoDocConfig, DiagnosticoPregunta } from '@/app/models/negocio.model';

const TIPOS_RESPUESTA = [
  { value: 'texto', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'opciones', label: 'Opciones (una)' },
  { value: 'booleano', label: 'Sí / No' },
  { value: 'cumplimiento', label: 'Cumplimiento (Cumple / Parcial / No cumple)' },
];

@Component({
  selector: 'diagnostico-config-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckbox,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatIcon,
    MatProgressSpinner,
    PageHeader,
  ],
  templateUrl: './diagnostico-config.page.html',
})
export default class DiagnosticoConfigPage {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  preguntas = signal<DiagnosticoPregunta[]>([]);
  docConfigs = signal<DiagnosticoDocConfig[]>([]);
  loadingP = signal(true);
  loadingD = signal(true);
  editingP = signal<DiagnosticoPregunta | null>(null);
  editingD = signal<DiagnosticoDocConfig | null>(null);
  tipos = TIPOS_RESPUESTA;

  preguntaForm = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    tipo_respuesta: ['texto', Validators.required],
    opciones: [''],
    ayuda_contextual: [''],
    orden: [99],
    es_obligatoria: [false],
    activo: [true],
  });

  docForm = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    tipo_archivo: [''],
    maximo_archivos: [null as number | null],
    orden: [99],
    es_obligatorio: [false],
    activo: [true],
  });

  constructor() {
    this.loadPreguntas();
    this.loadDocs();
  }

  tipoLabel = (t: string) => TIPOS_RESPUESTA.find(x => x.value === t)?.label || t;

  loadPreguntas() {
    this.api.diagPreguntas().subscribe((r) => {
      this.preguntas.set(r.data);
      this.loadingP.set(false);
    });
  }

  loadDocs() {
    this.api.diagDocConfigs().subscribe((r) => {
      this.docConfigs.set(r.data);
      this.loadingD.set(false);
    });
  }

  editPregunta(p: DiagnosticoPregunta) {
    this.editingP.set(p);
    this.preguntaForm.setValue({
      titulo: p.titulo,
      descripcion: p.descripcion ?? '',
      tipo_respuesta: p.tipo_respuesta,
      opciones: (p.opciones || []).join('\n'),
      ayuda_contextual: p.ayuda_contextual ?? '',
      orden: p.orden,
      es_obligatoria: !!p.es_obligatoria,
      activo: !!p.activo,
    });
  }

  cancelP() {
    this.editingP.set(null);
    this.preguntaForm.reset({ tipo_respuesta: 'texto', orden: 99, activo: true, es_obligatoria: false });
  }

  savePregunta() {
    if (this.preguntaForm.invalid) return;
    const v = this.preguntaForm.getRawValue();
    const payload: Partial<DiagnosticoPregunta> = {
      titulo: v.titulo!,
      descripcion: v.descripcion || null,
      tipo_respuesta: v.tipo_respuesta as DiagnosticoPregunta['tipo_respuesta'],
      opciones: v.tipo_respuesta === 'opciones' && v.opciones
        ? v.opciones.split('\n').map(s => s.trim()).filter(Boolean)
        : null,
      ayuda_contextual: v.ayuda_contextual || null,
      orden: v.orden ?? 99,
      es_obligatoria: !!v.es_obligatoria,
      activo: !!v.activo,
    };
    const edit = this.editingP();
    const req: Observable<unknown> = edit ? this.api.updateDiagPregunta(edit.id, payload) : this.api.createDiagPregunta(payload);
    req.subscribe({
      next: () => {
        this.snack.open(edit ? 'Pregunta actualizada' : 'Pregunta creada', 'OK', { duration: 2000 });
        this.cancelP();
        this.loadPreguntas();
      },
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  removePregunta(p: DiagnosticoPregunta) {
    if (!confirm(`¿Eliminar la pregunta "${p.titulo.slice(0, 50)}…"?`)) return;
    this.api.deleteDiagPregunta(p.id).subscribe({
      next: () => this.loadPreguntas(),
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  editDoc(c: DiagnosticoDocConfig) {
    this.editingD.set(c);
    this.docForm.setValue({
      titulo: c.titulo,
      descripcion: c.descripcion ?? '',
      tipo_archivo: c.tipo_archivo ?? '',
      maximo_archivos: c.maximo_archivos,
      orden: c.orden,
      es_obligatorio: !!c.es_obligatorio,
      activo: !!c.activo,
    });
  }

  cancelD() {
    this.editingD.set(null);
    this.docForm.reset({ orden: 99, activo: true, es_obligatorio: false });
  }

  saveDoc() {
    if (this.docForm.invalid) return;
    const v = this.docForm.getRawValue();
    const payload: Partial<DiagnosticoDocConfig> = {
      titulo: v.titulo!,
      descripcion: v.descripcion || null,
      tipo_archivo: v.tipo_archivo || null,
      maximo_archivos: v.maximo_archivos,
      orden: v.orden ?? 99,
      es_obligatorio: !!v.es_obligatorio,
      activo: !!v.activo,
    };
    const edit = this.editingD();
    const req: Observable<unknown> = edit ? this.api.updateDiagDocConfig(edit.id, payload) : this.api.createDiagDocConfig(payload);
    req.subscribe({
      next: () => {
        this.snack.open(edit ? 'Documento actualizado' : 'Documento creado', 'OK', { duration: 2000 });
        this.cancelD();
        this.loadDocs();
      },
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  removeDoc(c: DiagnosticoDocConfig) {
    if (!confirm(`¿Eliminar el documento "${c.titulo}"?`)) return;
    this.api.deleteDiagDocConfig(c.id).subscribe({
      next: () => this.loadDocs(),
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3500 }),
    });
  }
}
