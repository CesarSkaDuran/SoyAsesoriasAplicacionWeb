import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { CatalogoItem, Empleado } from '@/app/models/empleado.model';

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
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header [title]="editing ? 'Editar empleado' : 'Nuevo empleado'" />
    <mat-dialog-content>
      <form
        [formGroup]="form"
        class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-1 pt-3 sm:grid-cols-2"
      >
        <!-- Datos personales -->
        <div
          class="mb-2 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-navy sm:col-span-2"
        >
          <span class="size-2 rounded-full bg-brand-medium"></span>
          Datos personales
        </div>
        <mat-form-field>
          <mat-label>Primer nombre *</mat-label>
          <input
            matInput
            formControlName="primer_nombre"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Segundo nombre</mat-label>
          <input
            matInput
            formControlName="segundo_nombre"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Primer apellido *</mat-label>
          <input
            matInput
            formControlName="primer_apellido"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Segundo apellido</mat-label>
          <input
            matInput
            formControlName="segundo_apellido"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tipo documento</mat-label>
          <mat-select formControlName="tipo_documento">
            <mat-option value="CC">CC</mat-option>
            <mat-option value="CE">CE</mat-option>
            <mat-option value="PAS">Pasaporte</mat-option>
            <mat-option value="OTRO">Otro</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Número de documento *</mat-label>
          <input
            matInput
            formControlName="numero_documento"
          />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Dirección</mat-label>
          <input
            matInput
            formControlName="direccion"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Móvil</mat-label>
          <input
            matInput
            formControlName="movil"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Correo electrónico</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
          />
        </mat-form-field>

        <!-- Contrato -->
        <div
          class="mb-2 mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-navy sm:col-span-2"
        >
          <span class="size-2 rounded-full bg-brand-medium"></span>
          Contrato
        </div>
        <mat-form-field>
          <mat-label>Fecha de ingreso</mat-label>
          <input
            matInput
            [matDatepicker]="pickerIngreso"
            formControlName="fecha_ingreso"
          />
          <mat-datepicker-toggle
            matIconSuffix
            [for]="pickerIngreso"
          />
          <mat-datepicker #pickerIngreso />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tipo de contrato</mat-label>
          <mat-select formControlName="tipo_contrato">
            <mat-option value="indefinido">Indefinido</mat-option>
            <mat-option value="fijo">Término fijo</mat-option>
            <mat-option value="obra_labor">Obra o labor</mat-option>
            <mat-option value="aprendizaje">Aprendizaje</mat-option>
            <mat-option value="prestacion">Prestación de servicios</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tipo de vinculación</mat-label>
          <mat-select formControlName="tipo_vinculacion">
            <mat-option value="directa">Directa</mat-option>
            <mat-option value="temporal">Temporal</mat-option>
            <mat-option value="independiente">Independiente</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Periodo de pago</mat-label>
          <mat-select formControlName="periodo_pago">
            <mat-option value="mensual">Mensual</mat-option>
            <mat-option value="quincenal">Quincenal</mat-option>
            <mat-option value="semanal">Semanal</mat-option>
          </mat-select>
        </mat-form-field>
        <searchable-select
          label="Cargo"
          [items]="cargos()"
          displayKey="nombre"
          formControlName="cargo_id"
        />
        <mat-form-field>
          <mat-label>Riesgo ARL</mat-label>
          <mat-select formControlName="riesgo">
            <mat-option value="I">I</mat-option>
            <mat-option value="II">II</mat-option>
            <mat-option value="III">III</mat-option>
            <mat-option value="IV">IV</mat-option>
            <mat-option value="V">V</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Salario base</mat-label>
          <input
            matInput
            type="number"
            formControlName="salario_base"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Subsidio de transporte</mat-label>
          <input
            matInput
            type="number"
            formControlName="subsidio_transporte"
          />
        </mat-form-field>

        <!-- Seguridad social -->
        <div
          class="mb-2 mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-navy sm:col-span-2"
        >
          <span class="size-2 rounded-full bg-brand-medium"></span>
          Seguridad social
        </div>
        <searchable-select
          label="EPS"
          [items]="eps()"
          displayKey="nombre"
          formControlName="eps_id"
        />
        <searchable-select
          label="ARL"
          [items]="arl()"
          displayKey="nombre"
          formControlName="arl_id"
        />
        <searchable-select
          label="Fondo de pensiones"
          [items]="pensiones()"
          displayKey="nombre"
          formControlName="pension_id"
        />
        <searchable-select
          label="Caja de compensación"
          [items]="cajas()"
          displayKey="nombre"
          formControlName="caja_cf_id"
        />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button
        matButton
        mat-dialog-close
      >
        Cancelar
      </button>
      <button
        matButton="filled"
        [disabled]="form.invalid || saving()"
        (click)="save()"
      >
        {{ saving() ? 'Guardando…' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class EmpleadoFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
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
    subsidio_transporte: [this.data.empleado?.subsidio_transporte ?? null],
    eps_id: [this.data.empleado?.eps_id ?? null],
    arl_id: [this.data.empleado?.arl_id ?? null],
    pension_id: [this.data.empleado?.pension_id ?? null],
    caja_cf_id: [this.data.empleado?.caja_cf_id ?? null],
  });

  constructor() {
    this.api.catalogos().subscribe((cat) => {
      this.cargos.set(cat['cargos'] ?? []);
      this.eps.set(cat['eps'] ?? []);
      this.arl.set(cat['arl'] ?? []);
      this.pensiones.set(cat['pensiones'] ?? []);
      this.cajas.set(cat['cajas_compensacion'] ?? []);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload: any = {
      ...this.form.value,
      empresa_id: this.data.empresaId,
    };
    if (payload.fecha_ingreso instanceof Date) {
      payload.fecha_ingreso = payload.fecha_ingreso
        .toISOString()
        .substring(0, 10);
    }

    const request = this.editing
      ? this.api.updateEmpleado(this.data.empleado!.id, payload)
      : this.api.createEmpleado(payload);

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
