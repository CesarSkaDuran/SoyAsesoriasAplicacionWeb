import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Empresa } from '@/app/models/user.model';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'nomina-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header title="Nueva nómina" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="flex flex-col gap-y-1 pt-2"
      >
        @if (isAdmin()) {
          <searchable-select
            label="Empresa"
            [items]="empresas()"
            displayKey="razon_social"
            formControlName="empresa_id"
          />
        }

        <div class="grid grid-cols-2 gap-x-4">
          <mat-form-field appearance="outline">
            <mat-label>Mes</mat-label>
            <mat-select [formControl]="mesControl">
              @for (m of meses; track m; let i = $index) {
                <mat-option [value]="i">{{ m }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Quincena</mat-label>
            <mat-select [formControl]="quincenaControl">
              <mat-option [value]="1">Primera quincena</mat-option>
              <mat-option [value]="2">Segunda quincena</mat-option>
              <mat-option [value]="0">Mes completo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Nombre del periodo</mat-label>
          <input
            matInput
            formControlName="nombre_periodo"
            placeholder="Ej: Enero 2026 - Primera quincena"
          />
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
        Crear y liquidar
      </button>
    </mat-dialog-actions>
  `,
})
export class NominaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private router = inject(Router);
  private ref = inject(MatDialogRef<NominaFormDialog>);
  private snack = inject(MatSnackBar);

  empresas = signal<Empresa[]>([]);
  meses = MESES;
  saving = false;
  isAdmin = () => this.creds.isAdmin();

  mesControl = this.fb.nonNullable.control(new Date().getMonth());
  quincenaControl = this.fb.nonNullable.control(new Date().getDate() <= 15 ? 1 : 2);

  form = this.fb.group({
    empresa_id: [null as number | null],
    nombre_periodo: ['', Validators.required],
  });

  constructor() {
    const mes = this.meses[this.mesControl.value];
    const q = ['Mes', '1a quincena', '2a quincena'][this.quincenaControl.value];
    this.form.patchValue({
      nombre_periodo: `${mes} ${new Date().getFullYear()} - ${q}`,
    });

    if (this.isAdmin()) {
      this.form.get('empresa_id')!.addValidators(Validators.required);
      this.api.empresas('', 1, 1000).subscribe((r) => this.empresas.set(r.data));
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const empresaId = this.isAdmin()
      ? this.form.value.empresa_id
      : this.creds.user?.empresa?.id;

    this.api
      .createNomina({
        empresa_id: empresaId!,
        nombre_periodo: this.form.value.nombre_periodo!,
      })
      .subscribe({
        next: (res) => {
          this.ref.close(true);
          this.router.navigate(['/admin/nominas', res.nomina.id, 'liquidar']);
        },
        error: () => {
          this.saving = false;
          this.snack.open('No se pudo crear la nómina', 'Cerrar');
        },
      });
  }
}
