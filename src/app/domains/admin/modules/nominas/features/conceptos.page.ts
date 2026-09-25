import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { ConceptoNomina } from '@/app/models/empleado.model';
import { ConceptoFormDialog } from '../components/concepto-form.dialog';

@Component({
  selector: 'conceptos-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIcon,
    MatTableModule,
    MatProgressSpinner,
    PageHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conceptos.page.html',
})
export default class ConceptosPage {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  protected columns = [
    'nombre', 'salario', 'tratamiento', 'tope', 'fuente', 'estado', 'acciones',
  ];
  protected conceptos = signal<ConceptoNomina[]>([]);
  protected loading = signal(false);

  protected busqueda = new FormControl('');
  protected filtroActivo = new FormControl('1');
  protected filtroTratamiento = new FormControl('');
  protected filtroSalarial = new FormControl('');
  protected filtroPendiente = new FormControl('');

  constructor() {
    this.busqueda.valueChanges.pipe(debounceTime(300)).subscribe(() => this.load());
    for (const c of [this.filtroActivo, this.filtroTratamiento, this.filtroSalarial, this.filtroPendiente]) {
      c.valueChanges.subscribe(() => this.load());
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.conceptosNomina({
      activos: this.filtroActivo.value || '1',
      tratamiento: this.filtroTratamiento.value || undefined,
      salarial: this.filtroSalarial.value || undefined,
      pendiente: this.filtroPendiente.value || undefined,
      q: this.busqueda.value || undefined,
    }).subscribe({
      next: (res) => { this.conceptos.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  pendiente(c: ConceptoNomina): boolean {
    return !!c.activo_pendiente_verificacion;
  }

  openForm(concepto?: ConceptoNomina) {
    if (concepto && this.pendiente(concepto)) return; // bloqueado: no editable
    this.dialog
      .open(ConceptoFormDialog, { width: '560px', maxWidth: '96vw', data: { concepto } })
      .afterClosed()
      .subscribe((ok) => { if (ok) this.load(); });
  }
}
