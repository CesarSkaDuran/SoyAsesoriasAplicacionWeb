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
import { CatalogoItem } from '@/app/models/empleado.model';
import { CuentaCobro } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'cuenta-cobro-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header [title]="isEdit ? 'Editar cuenta de cobro' : 'Nueva cuenta de cobro'" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-1 pt-3 sm:grid-cols-2"
      >
        <div class="mb-2 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0d2b6b] sm:col-span-2">
          <span class="size-2 rounded-full bg-[#12377a]"></span>
          Cliente y facturación
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de cliente</mat-label>
          <mat-select formControlName="cliente_tipo">
            <mat-option value="empresa">Empresa</mat-option>
            <mat-option value="tercero">Tercero</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de cuenta</mat-label>
          <mat-select formControlName="tipo">
            <mat-option [value]="1">Normal</mat-option>
            <mat-option [value]="2">Recurrente</mat-option>
          </mat-select>
        </mat-form-field>

        @if (form.controls.cliente_tipo.value === 'empresa') {
          <searchable-select
            class="sm:col-span-2"
            label="Empresa"
            [items]="data.empresas || []"
            displayKey="razon_social"
            formControlName="empresa_id"
          />
        } @else {
          <searchable-select
            class="sm:col-span-2"
            label="Tercero"
            [items]="terceros()"
            displayKey="nombre"
            formControlName="tercero_id"
          />
        }

        <searchable-select
          label="Sucursal"
          nullLabel="Sin sucursal"
          [items]="sucursales()"
          displayKey="nombre"
          formControlName="sucursal_id"
        />

        <mat-form-field appearance="outline">
          <mat-label>Concepto</mat-label>
          <mat-select formControlName="nombre">
            @for (concepto of conceptos; track concepto) {
              <mat-option [value]="concepto">{{ concepto }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Banco</mat-label>
          <mat-select formControlName="banco">
            <mat-option value="">Sin banco</mat-option>
            @for (banco of bancos(); track banco.id) {
              <mat-option [value]="banco.nombre">{{ banco.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Meses</mat-label>
          <input matInput type="number" min="1" formControlName="meses" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="fecha"
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <div class="mb-2 mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0d2b6b] sm:col-span-2">
          <span class="size-2 rounded-full bg-[#12377a]"></span>
          Valores
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Valor</mat-label>
          <input
            matInput
            type="number"
            formControlName="valor_total"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>IVA</mat-label>
          <input
            matInput
            type="number"
            formControlName="iva"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>4x1000</mat-label>
          <input
            matInput
            type="number"
            formControlName="cuatroxmil"
          />
        </mat-form-field>

        <mat-form-field class="sm:col-span-2" appearance="outline">
          <mat-label>Observaciones</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="obs"
          ></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        matButton="text"
        mat-dialog-close
      >
        Cancelar
      </button>
      <button
        matButton="filled"
        [disabled]="form.invalid || saving"
        (click)="save()"
      >
        {{ saving ? 'Guardando…' : (isEdit ? 'Guardar' : 'Crear') }}
      </button>
    </mat-dialog-actions>
  `,
})
export class CuentaCobroDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<CuentaCobroDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ cuenta?: CuentaCobro; empresas?: Empresa[] }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { cuenta?: CuentaCobro; empresas?: Empresa[] };

  isEdit = !!this.data.cuenta;
  saving = false;
  sucursales = signal<CatalogoItem[]>([]);
  bancos = signal<CatalogoItem[]>([]);
  terceros = signal<CatalogoItem[]>([]);
  conceptos = [
    'Afiliaciones',
    'Planillas',
    'Asesorias',
    'Comisiones',
    'Honorarios',
    'Servicio Permanente',
    'Incapacidades',
    'Otro',
  ];

  form = this.fb.group({
    cliente_tipo: [this.data.cuenta?.tercero_id ? 'tercero' : 'empresa'],
    empresa_id: [this.data.cuenta?.empresa_id ?? (null as number | null)],
    tercero_id: [this.data.cuenta?.tercero_id ?? (null as number | null)],
    sucursal_id: [this.data.cuenta?.sucursal_id ?? (null as number | null)],
    tipo: [this.data.cuenta?.tipo ?? 1],
    nombre: [this.data.cuenta?.nombre || '', Validators.required],
    banco: [this.data.cuenta?.banco || ''],
    meses: [this.data.cuenta?.meses || '1'],
    fecha: [this.data.cuenta?.fecha || ''],
    valor_total: [this.data.cuenta?.valor_total ? Number(this.data.cuenta.valor_total) : (null as number | null), Validators.required],
    iva: [this.data.cuenta?.iva ? Number(this.data.cuenta.iva) : 0],
    cuatroxmil: [this.data.cuenta?.cuatroxmil ? Number(this.data.cuenta.cuatroxmil) : 0],
    obs: [this.data.cuenta?.obs || ''],
  });

  constructor() {
    this.api.catalogos().subscribe((catalogos) => {
      this.sucursales.set(catalogos['sucursales'] ?? []);
      this.bancos.set(catalogos['bancos'] ?? []);
      this.terceros.set(catalogos['terceros'] ?? []);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<CuentaCobro> = {
      empresa_id: v.cliente_tipo === 'empresa' ? v.empresa_id : null,
      tercero_id: v.cliente_tipo === 'tercero' ? v.tercero_id : null,
      sucursal_id: v.sucursal_id,
      tipo: v.tipo,
      nombre: v.nombre || undefined,
      banco: v.banco || null,
      meses: v.meses || null,
      fecha: v.fecha ? new Date(v.fecha).toISOString().slice(0, 10) : undefined,
      valor_total: v.valor_total ?? undefined,
      iva: v.iva ?? 0,
      cuatroxmil: v.cuatroxmil ?? 0,
      obs: v.obs || undefined,
    };

    const req = this.isEdit
      ? this.api.updatePago(this.data.cuenta!.id, payload)
      : this.api.createPago(payload);

    req.subscribe({
      next: () => {
        this.snack.open('Cuenta de cobro guardada', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snack.open(error?.error?.error || 'No se pudo guardar', 'Cerrar');
      },
    });
  }
}
