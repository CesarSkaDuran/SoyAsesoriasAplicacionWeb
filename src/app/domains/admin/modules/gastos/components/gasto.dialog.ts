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
import { CatalogoItem } from '@/app/models/empleado.model';
import { Gasto } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'gasto-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    DialogHeader,
  ],
  template: `
    <dialog-header [title]="isEdit ? 'Editar gasto' : 'Nuevo gasto'" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-1 pt-3 sm:grid-cols-2"
      >
        <div class="mb-2 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0d2b6b] sm:col-span-2">
          <span class="size-2 rounded-full bg-[#12377a]"></span>
          Proveedor y clasificación
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de proveedor</mat-label>
          <mat-select formControlName="proveedor_tipo">
            <mat-option value="tercero">Tercero</mat-option>
            <mat-option value="empresa">Empresa</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de gasto</mat-label>
          <mat-select formControlName="lista_gasto_id">
            <mat-option [value]="null">Sin clasificar</mat-option>
            @for (tipo of tiposGasto(); track tipo.id) {
              <mat-option [value]="tipo.id">{{ tipo.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (form.controls.proveedor_tipo.value === 'tercero') {
          <mat-form-field class="sm:col-span-2" appearance="outline">
            <mat-label>Tercero</mat-label>
            <mat-select formControlName="tercero_id">
              <mat-option [value]="null">Sin tercero</mat-option>
              @for (tercero of terceros(); track tercero.id) {
                <mat-option [value]="tercero.id">{{ tercero.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        } @else {
          <mat-form-field class="sm:col-span-2" appearance="outline">
            <mat-label>Empresa</mat-label>
            <mat-select formControlName="empresa_id">
              <mat-option [value]="null">Sin empresa</mat-option>
              @for (empresa of empresas(); track empresa.id) {
                <mat-option [value]="empresa.id">{{ empresa.razon_social }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Sucursal</mat-label>
          <mat-select formControlName="sucursal_id">
            <mat-option [value]="null">Sin sucursal</mat-option>
            @for (sucursal of sucursales(); track sucursal.id) {
              <mat-option [value]="sucursal.id">{{ sucursal.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Concepto</mat-label>
          <input matInput formControlName="nombre" />
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

        <div class="mb-2 mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0d2b6b] sm:col-span-2">
          <span class="size-2 rounded-full bg-[#12377a]"></span>
          Valores y fecha
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Valor</mat-label>
          <input
            matInput
            type="number"
            formControlName="valor"
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
          <mat-label>Fecha</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="fecha"
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <mat-form-field class="sm:col-span-2" appearance="outline">
          <mat-label>Descripción</mat-label>
          <textarea matInput rows="3" formControlName="descripcion"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="text" mat-dialog-close>Cancelar</button>
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
export class GastoDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<GastoDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ gasto?: Gasto }>(MAT_DIALOG_DATA);

  isEdit = !!this.data.gasto;
  saving = false;
  empresas = signal<Empresa[]>([]);
  terceros = signal<CatalogoItem[]>([]);
  sucursales = signal<CatalogoItem[]>([]);
  tiposGasto = signal<CatalogoItem[]>([]);
  bancos = signal<CatalogoItem[]>([]);

  form = this.fb.group({
    proveedor_tipo: [this.data.gasto?.empresa_id ? 'empresa' : 'tercero'],
    lista_gasto_id: [this.data.gasto?.lista_gasto_id ?? (null as number | null)],
    empresa_id: [this.data.gasto?.empresa_id ?? (null as number | null)],
    tercero_id: [this.data.gasto?.tercero_id ?? (null as number | null)],
    sucursal_id: [this.data.gasto?.sucursal_id ?? (null as number | null)],
    nombre: [this.data.gasto?.nombre || '', Validators.required],
    descripcion: [this.data.gasto?.descripcion || ''],
    banco: [this.data.gasto?.banco || ''],
    meses: [this.data.gasto?.meses || '1'],
    valor: [this.data.gasto?.valor ? Number(this.data.gasto.valor) : (null as number | null), Validators.required],
    iva: [this.data.gasto?.iva ? Number(this.data.gasto.iva) : 0],
    fecha: [this.data.gasto?.fecha || ''],
  });

  constructor() {
    this.api.empresas(undefined, 1, 500).subscribe((result) => this.empresas.set(result.data));
    this.api.catalogos().subscribe((catalogos) => {
      this.terceros.set(catalogos['terceros'] ?? []);
      this.sucursales.set(catalogos['sucursales'] ?? []);
      this.tiposGasto.set(catalogos['lista_gastos'] ?? []);
      this.bancos.set(catalogos['bancos'] ?? []);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<Gasto> = {
      lista_gasto_id: v.lista_gasto_id,
      empresa_id: v.proveedor_tipo === 'empresa' ? v.empresa_id : null,
      tercero_id: v.proveedor_tipo === 'tercero' ? v.tercero_id : null,
      sucursal_id: v.sucursal_id,
      nombre: v.nombre || undefined,
      descripcion: v.descripcion || undefined,
      banco: v.banco || null,
      meses: v.meses || null,
      valor: v.valor ?? undefined,
      iva: v.iva ?? 0,
      fecha: v.fecha ? new Date(v.fecha).toISOString().slice(0, 10) : undefined,
    };

    const req = this.isEdit
      ? this.api.updateGasto(this.data.gasto!.id, payload)
      : this.api.createGasto(payload);

    req.subscribe({
      next: () => {
        this.snack.open('Gasto guardado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snack.open(error?.error?.error || 'No se pudo guardar', 'Cerrar');
      },
    });
  }
}
