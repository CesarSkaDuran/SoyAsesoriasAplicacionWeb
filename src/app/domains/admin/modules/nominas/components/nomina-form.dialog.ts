import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
    SearchableSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nomina-form.dialog.html',
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
  saving = signal(false);
  isAdmin = () => this.creds.isAdmin();

  mesControl = this.fb.nonNullable.control(new Date().getMonth());
  quincenaControl = this.fb.nonNullable.control(new Date().getDate() <= 15 ? 1 : 2);

  form = this.fb.group({
    empresa_id: [null as number | null],
    nombre_periodo: ['', Validators.required],
    aplica_exoneracion: [false],
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
    this.saving.set(true);

    const empresaId = this.isAdmin()
      ? this.form.value.empresa_id
      : this.creds.user?.empresa?.id;

    const label = this.form.value.nombre_periodo || '';
    const vigencia = Number(label.match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear());
    const diasPeriodo = this.quincenaControl.value === 0 ? 30 : 15;
    const mes = this.mesControl.value;
    const ultimoDia = new Date(Date.UTC(vigencia, mes + 1, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const diaInicio = this.quincenaControl.value === 2 ? 16 : 1;
    const diaFin = this.quincenaControl.value === 1 ? 15 : ultimoDia;
    this.api
      .createNomina({
        empresa_id: empresaId!,
        nombre_periodo: label,
        vigencia,
        dias_periodo: diasPeriodo,
        aplica_exoneracion: this.isAdmin() && this.form.value.aplica_exoneracion === true,
        fecha_inicio: `${vigencia}-${pad(mes + 1)}-${pad(diaInicio)}`,
        fecha_fin: `${vigencia}-${pad(mes + 1)}-${pad(diaFin)}`,
      })
      .subscribe({
        next: (res) => {
          this.ref.close(true);
          this.router.navigate(['/admin/nominas', res.nomina.id, 'liquidar']);
        },
        error: () => {
          this.saving.set(false);
          this.snack.open('No se pudo crear la nómina', 'Cerrar');
        },
      });
  }
}
