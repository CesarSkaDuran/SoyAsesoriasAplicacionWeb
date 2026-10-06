import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { CatalogoItem, Empleado, PersonaIdentidad } from '@/app/models/empleado.model';

const IDENTIDAD_CAMPOS = [
  'primer_nombre',
  'segundo_nombre',
  'primer_apellido',
  'segundo_apellido',
  'tipo_documento',
  'fecha_nacimiento',
] as const;

export interface EmpleadoFormData {
  empresaId: number;
  empleado?: Empleado;
}

@Component({
  selector: 'empleado-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatCheckboxModule,
    DialogHeader,
    SearchableSelect,
    CurrencyPipe,
  ],
  templateUrl: './empleado-form.dialog.html',
})
export class EmpleadoFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<EmpleadoFormDialog>);
  private data = inject<EmpleadoFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as EmpleadoFormData;

  protected editing = !!this.data.empleado;
  protected saving = signal(false);
  protected cargos = signal<CatalogoItem[]>([]);
  protected eps = signal<CatalogoItem[]>([]);
  protected arl = signal<CatalogoItem[]>([]);
  protected pensiones = signal<CatalogoItem[]>([]);
  protected cajas = signal<CatalogoItem[]>([]);
  protected smmlv = signal(0);
  protected personaExistente = signal<PersonaIdentidad | null>(null);
  protected buscandoIdentidad = signal(false);
  private ultimoDocBuscado = '';

  protected form = this.fb.group({
    primer_nombre: [this.data.empleado?.primer_nombre ?? '', Validators.required],
    segundo_nombre: [this.data.empleado?.segundo_nombre ?? ''],
    primer_apellido: [
      this.data.empleado?.primer_apellido ?? '',
      Validators.required,
    ],
    segundo_apellido: [this.data.empleado?.segundo_apellido ?? ''],
    tipo_documento: [this.data.empleado?.tipo_documento ?? 'CC'],
    numero_documento: [
      this.data.empleado?.numero_documento ?? '',
      Validators.required,
    ],
    fecha_nacimiento: [this.toDate(this.data.empleado?.fecha_nacimiento)],
    direccion: [this.data.empleado?.direccion ?? ''],
    movil: [this.data.empleado?.movil ?? ''],
    email: [this.data.empleado?.email ?? ''],
    fecha_ingreso: [this.data.empleado?.fecha_ingreso ?? null],
    tipo_contrato: [this.data.empleado?.tipo_contrato ?? 'indefinido'],
    tipo_vinculacion: [this.data.empleado?.tipo_vinculacion ?? 'directa'],
    periodo_pago: [this.data.empleado?.periodo_pago ?? 'mensual'],
    cargo_id: [this.data.empleado?.cargo_id ?? null],
    riesgo: [this.data.empleado?.riesgo ?? 'I'],
    salario_base: [this.data.empleado?.salario_base ?? null],
    auxilio_transporte_mode: [this.data.empleado?.auxilio_transporte_mode ?? 'automatico'],
    eps_id: [this.data.empleado?.eps_id ?? null],
    arl_id: [this.data.empleado?.arl_id ?? null],
    pension_id: [this.data.empleado?.pension_id ?? null],
    caja_cf_id: [this.data.empleado?.caja_cf_id ?? null],
    tipo_cotizante: [this.data.empleado?.tipo_cotizante ?? ''],
    subtipo_cotizante: [this.data.empleado?.subtipo_cotizante ?? ''],
    tipo_trabajador: [this.data.empleado?.tipo_trabajador ?? ''],
    subtipo_trabajador: [this.data.empleado?.subtipo_trabajador ?? ''],
    salario_integral: [!!this.data.empleado?.salario_integral],
    salario_variable: [!!this.data.empleado?.salario_variable],
    extranjero_sin_pension: [!!this.data.empleado?.extranjero_sin_pension],
    colombiano_exterior: [!!this.data.empleado?.colombiano_exterior],
    salario_menor_motivo: [this.data.empleado?.salario_menor_motivo ?? ''],
  });

  constructor() {
    if (this.editing && !this.credentials.isAdmin()) this.form.controls.fecha_ingreso.disable();
    this.api.catalogos().subscribe((cat) => {
      this.cargos.set(cat['cargos'] ?? []);
      this.eps.set(cat['eps'] ?? []);
      this.arl.set(cat['arl'] ?? []);
      this.pensiones.set(cat['pensiones'] ?? []);
      this.cajas.set(cat['cajas_compensacion'] ?? []);
    });
    this.api.nominaParametros(new Date().getFullYear()).subscribe({
      next: ({ parametros }) => this.smmlv.set(Number(parametros.salario_minimo) || 0),
      error: () => {},
    });
  }

  private toDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Búsqueda ciega al salir del campo de cédula: si la persona ya existe,
  // precarga la identidad (readonly) sin exponer datos de otras empresas.
  buscarDocumento() {
    if (this.editing || this.buscandoIdentidad()) return;
    const doc = String(this.form.controls.numero_documento.value || '')
      .trim()
      .toUpperCase();
    if (!doc || doc === this.ultimoDocBuscado) return;
    this.ultimoDocBuscado = doc;
    this.buscandoIdentidad.set(true);
    this.api.buscarPersona(doc).subscribe({
      next: (r) => {
        this.buscandoIdentidad.set(false);
        if (r.existe && r.persona) {
          this.personaExistente.set(r.persona);
          this.form.patchValue({
            primer_nombre: r.persona.primer_nombre ?? '',
            segundo_nombre: r.persona.segundo_nombre ?? '',
            primer_apellido: r.persona.primer_apellido ?? '',
            segundo_apellido: r.persona.segundo_apellido ?? '',
            tipo_documento: r.persona.tipo_documento ?? 'CC',
            fecha_nacimiento: this.toDate(r.persona.fecha_nacimiento),
          });
          for (const campo of IDENTIDAD_CAMPOS) {
            this.form.controls[campo].disable();
          }
        } else {
          this.personaExistente.set(null);
          for (const campo of IDENTIDAD_CAMPOS) {
            this.form.controls[campo].enable();
          }
        }
      },
      error: () => this.buscandoIdentidad.set(false),
    });
  }

  bajoMinimo(): boolean {
    const salario = Number(this.form.get('salario_base')?.value) || 0;
    return this.smmlv() > 0 && salario < this.smmlv();
  }

  save() {
    if (this.form.invalid) return;
    if (this.bajoMinimo() && !String(this.form.get('salario_menor_motivo')?.value || '').trim()) {
      this.snackBar.open(
        'El salario es inferior al SMMLV: registra el motivo (medio tiempo, contrato especial…)',
        'Cerrar',
        { duration: 4000 }
      );
      this.form.get('salario_menor_motivo')?.markAsTouched();
      return;
    }
    this.saving.set(true);

    // getRawValue incluye los campos de identidad deshabilitados al
    // precargar una persona existente.
    const payload: any = {
      ...this.form.getRawValue(),
      empresa_id: this.data.empresaId,
    };
    for (const campo of ['fecha_ingreso', 'fecha_nacimiento'] as const) {
      if (payload[campo] instanceof Date) {
        payload[campo] = (payload[campo] as Date).toISOString().substring(0, 10);
      }
    }

    const request: Observable<unknown> = this.editing
      ? this.api.updateEmpleado(this.data.empleado!.id, payload)
      : this.api.contratarEmpleado(payload);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editing ? 'Empleado actualizado' : 'Empleado creado',
          'Cerrar',
          { duration: 2500 }
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(
          err?.error?.error ?? 'Error al guardar el empleado',
          'Cerrar',
          { duration: 3000 }
        );
      },
    });
  }
}
