import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { CatalogoItem } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';

export interface EmpresaFormData {
  empresa?: Empresa;
}

@Component({
  selector: 'empresa-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header [title]="editing ? 'Editar empresa' : 'Nueva empresa'" />
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-y-1 pt-2">

        <!-- DATOS DE LA EMPRESA -->
        <div class="mb-2 mt-1 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Datos de la empresa</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <mat-form-field class="sm:col-span-2">
            <mat-label>Razón social *</mat-label>
            <input matInput formControlName="razon_social" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Tipo de empresa</mat-label>
            <mat-select formControlName="tipo_empresa">
              <mat-option value="natural">Persona Natural</mat-option>
              <mat-option value="juridica">Persona Jurídica</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-4">
          <mat-form-field>
            <mat-label>Tipo documento</mat-label>
            <mat-select formControlName="tipo_documento">
              <mat-option value="NIT">NIT</mat-option>
              <mat-option value="CC">CC</mat-option>
              <mat-option value="CE">CE</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field class="sm:col-span-2">
            <mat-label>Número de documento *</mat-label>
            <input matInput formControlName="num_documento" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>DV</mat-label>
            <input matInput formControlName="dv" maxlength="2" />
          </mat-form-field>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <mat-form-field class="sm:col-span-2">
            <mat-label>Dirección</mat-label>
            <input matInput formControlName="direccion" />
          </mat-form-field>
          <searchable-select
            label="Departamento"
            [items]="departamentos()"
            displayKey="nombre"
            formControlName="departamento_id"
            (selectionChange)="onDepartamentoChange()"
          />
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <searchable-select
            label="Ciudad"
            [items]="ciudadesFiltradas()"
            displayKey="nombre"
            formControlName="ciudad_id"
          />
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Correo de contacto</mat-label>
            <input matInput type="email" formControlName="email_contacto" />
          </mat-form-field>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <mat-form-field>
            <mat-label>Teléfono móvil</mat-label>
            <input matInput formControlName="telefono_movil" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono fijo</mat-label>
            <input matInput formControlName="telefono_fijo" />
          </mat-form-field>
        </div>

        <!-- DATOS REPRESENTANTE LEGAL Y CONTACTO -->
        <div class="mb-2 mt-3 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Datos representante legal y contacto</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <mat-form-field>
            <mat-label>Nombre representante</mat-label>
            <input matInput formControlName="representante_legal" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Email representante</mat-label>
            <input matInput type="email" formControlName="email_responsable" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono representante</mat-label>
            <input matInput formControlName="telefono_responsable" />
          </mat-form-field>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <mat-form-field>
            <mat-label>Nombre contacto</mat-label>
            <input matInput formControlName="nombre_contacto" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Email contacto</mat-label>
            <input matInput type="email" formControlName="email_contacto2" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono contacto</mat-label>
            <input matInput formControlName="telefono_contacto" />
          </mat-form-field>
        </div>

        <!-- SEGURIDAD SOCIAL -->
        <div class="mb-2 mt-3 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Seguridad social</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-4">
          <mat-form-field>
            <mat-label>ARL</mat-label>
            <mat-select formControlName="arl_nombre">
              @for (a of arlOpciones; track a) {
                <mat-option [value]="a">{{ a }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Riesgo</mat-label>
            <mat-select formControlName="riesgo">
              <mat-option value="I">I</mat-option>
              <mat-option value="II">II</mat-option>
              <mat-option value="III">III</mat-option>
              <mat-option value="IV">IV</mat-option>
              <mat-option value="V">V</mat-option>
            </mat-select>
          </mat-form-field>
          <searchable-select
            label="Caja C.F"
            [items]="cajasCompensacion()"
            displayKey="nombre"
            formControlName="caja_compensacion_id"
          />
          <mat-form-field>
            <mat-label>Exonerado parafiscales</mat-label>
            <mat-select formControlName="exonerado_parafiscales">
              <mat-option value="si">Sí</mat-option>
              <mat-option value="no">No</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field>
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="2" formControlName="observaciones"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancelar</button>
      <button matButton="filled" [disabled]="form.invalid || saving()" (click)="save()">
        {{ saving() ? 'Guardando…' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class EmpresaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<EmpresaFormDialog>);
  private data = inject<EmpresaFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as EmpresaFormData;

  protected editing = !!this.data.empresa;
  protected saving = signal(false);
  protected departamentos = signal<CatalogoItem[]>([]);
  protected ciudades = signal<(CatalogoItem & { departamento_id?: number })[]>([]);
  protected ciudadesFiltradas = signal<CatalogoItem[]>([]);
  protected cajasCompensacion = signal<CatalogoItem[]>([]);

  protected arlOpciones = [
    'Sura', 'Alfa S.A.', 'Aurora S.A', 'Axa Colpatria', 'Bolívar',
    'Colmena', 'La Equidad', 'Liberty', 'Mapfre', 'Positiva', 'No tiene',
  ];

  protected form = this.fb.group({
    razon_social: [this.data.empresa?.razon_social ?? '', Validators.required],
    tipo_documento: [this.data.empresa?.tipo_documento ?? 'NIT'],
    num_documento: [this.data.empresa?.num_documento ?? '', Validators.required],
    dv: [this.data.empresa?.dv ?? ''],
    tipo_empresa: [this.data.empresa?.tipo_empresa ?? 'juridica'],
    riesgo: [this.data.empresa?.riesgo ?? 'I'],
    email: [this.data.empresa?.email ?? ''],
    email_contacto: [this.data.empresa?.email_contacto ?? ''],
    telefono_fijo: [this.data.empresa?.telefono_fijo ?? ''],
    telefono_movil: [this.data.empresa?.telefono_movil ?? ''],
    direccion: [this.data.empresa?.direccion ?? ''],
    departamento_id: [this.data.empresa?.departamento_id ?? null],
    ciudad_id: [this.data.empresa?.ciudad_id ?? null],
    representante_legal: [this.data.empresa?.representante_legal ?? ''],
    nombre_contacto: [this.data.empresa?.nombre_contacto ?? ''],
    telefono_contacto: [this.data.empresa?.telefono_contacto ?? ''],
    email_responsable: [this.data.empresa?.email_responsable ?? ''],
    telefono_responsable: [this.data.empresa?.telefono_responsable ?? ''],
    email_contacto2: [''],
    caja_compensacion_id: [this.data.empresa?.caja_compensacion_id ?? null],
    arl_nombre: [''],
    exonerado_parafiscales: [this.data.empresa?.exonerado_parafiscales ?? ''],
    observaciones: [this.data.empresa?.observaciones ?? ''],
  });

  constructor() {
    this.api.catalogos().subscribe((cat) => {
      this.departamentos.set(cat['departamentos'] ?? []);
      this.ciudades.set(cat['ciudades'] ?? []);
      this.cajasCompensacion.set(cat['cajas_compensacion'] ?? []);
      this.onDepartamentoChange(false);
    });
  }

  onDepartamentoChange(clear = true) {
    const depId = this.form.value.departamento_id;
    const ciudades = this.ciudades();
    this.ciudadesFiltradas.set(
      depId ? ciudades.filter((c) => !c.departamento_id || c.departamento_id === depId) : ciudades
    );
    if (clear) this.form.patchValue({ ciudad_id: null });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.value;
    const payload: Partial<Empresa> = {};
    const skipKeys = ['email_contacto2', 'arl_nombre'];
    for (const [k, val] of Object.entries(v)) {
      if (skipKeys.includes(k)) continue;
      if (val !== undefined && val !== null && val !== '') {
        (payload as any)[k] = val;
      }
    }

    const request = this.editing
      ? this.api.updateEmpresa(this.data.empresa!.id, payload)
      : this.api.createEmpresa(payload);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editing ? 'Empresa actualizada' : 'Empresa creada',
          'Cerrar',
          { duration: 2500 }
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Error al guardar la empresa', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
