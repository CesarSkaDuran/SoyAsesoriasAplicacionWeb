import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import {
  CorteFecha,
  Festivo,
  Normativa,
  ValorHoraResponse,
} from '@/app/models/empleado.model';
import { NominaParametrosDialog } from '../components/nomina-parametros.dialog';

const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const DIA_SEMANA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  timeZone: 'UTC',
});

export type CorteVista = {
  valor: number;
  desde: string;
  hasta: string | null;
  estado: 'pasado' | 'vigente' | 'futuro';
};

export type CortesVista = {
  actual: CorteVista | null;
  historial: CorteVista[];
};

@Component({
  selector: 'normativa-page',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressSpinner,
    MatSelectModule,
    MatTableModule,
    PageHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './normativa.page.html',
  styleUrl: './normativa.page.css',
})
export default class NormativaPage {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  protected creds = inject(CredentialsService);

  protected normativa = signal<Normativa | null>(null);
  protected vigencias = signal<number[]>([]);
  protected festivos = signal<Festivo[]>([]);
  protected loading = signal(true);
  protected loadError = signal('');

  protected vigenciaCtrl = new FormControl<number | null>(null);
  protected calcSalario = new FormControl<number | null>(null);
  protected calcFecha = new FormControl(this.hoy());
  protected calc = signal<ValorHoraResponse | null>(null);
  protected calcLoading = signal(false);

  protected columnsCalc = ['concepto', 'recargo', 'factor', 'valor'];
  protected columnsFestivos = ['fecha', 'dia', 'nombre'];

  protected jornada = computed(() => this.cortesVista(this.normativa()?.jornada_cortes, 'horas_semanales'));
  protected dominical = computed(() => this.cortesVista(this.normativa()?.dominical_cortes, 'pct'));
  protected proximoFestivo = computed(() => {
    const hoy = this.hoy();
    return this.festivos().find((f) => f.fecha >= hoy) ?? null;
  });

  constructor() {
    this.vigenciaCtrl.valueChanges.subscribe((v) => this.load(v ?? undefined));
    this.calcSalario.valueChanges.pipe(debounceTime(300)).subscribe(() => this.calcular());
    this.calcFecha.valueChanges.pipe(debounceTime(300)).subscribe(() => this.calcular());
    this.load();
  }

  protected load(vigencia?: number) {
    this.loading.set(true);
    this.loadError.set('');
    this.api.nominaNormativa(vigencia).subscribe({
      next: (res) => {
        this.normativa.set(res.normativa);
        this.vigencias.set(res.vigencias);
        this.festivos.set(res.festivos);
        this.vigenciaCtrl.setValue(res.normativa.vigencia, { emitEvent: false });
        if (!this.calcSalario.value) this.calcSalario.setValue(Number(res.normativa.salario_minimo));
        this.loading.set(false);
        this.calcular();
      },
      error: (err) => {
        this.loading.set(false);
        const detalle = err?.error?.error || 'No se pudo cargar la normativa.';
        this.loadError.set(
          detalle === 'Nómina no encontrada'
            ? 'La API conectada todavía no tiene el endpoint de Normativa y está interpretando “normativa” como el ID de una nómina. Reinicia o actualiza la API y vuelve a intentar.'
            : `${detalle} Verifica la conexión con la API y vuelve a intentar.`
        );
        this.snack.open(detalle, 'Cerrar');
      },
    });
  }

  protected calcular() {
    const salario = Number(this.calcSalario.value);
    if (!salario || salario <= 0) {
      this.calc.set(null);
      return;
    }
    this.calcLoading.set(true);
    this.api.valorHoraNomina(salario, this.calcFecha.value || undefined).subscribe({
      next: (res) => {
        this.calc.set(res);
        this.calcLoading.set(false);
      },
      error: () => this.calcLoading.set(false),
    });
  }

  protected editarParametros() {
    const n = this.normativa();
    if (!n) return;
    this.dialog
      .open(NominaParametrosDialog, {
        width: '720px',
        maxWidth: '96vw',
        data: n.vigencia,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.load(n.vigencia);
      });
  }

  // ── Cortes por fecha (jornada y dominical vienen como JSON) ────────────────

  protected cortes(valor: CorteFecha[] | string | null | undefined): CorteFecha[] {
    const list = typeof valor === 'string' ? JSON.parse(valor || '[]') : (valor ?? []);
    return (list as CorteFecha[])
      .filter((c) => c && c.desde)
      .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
  }

  /** Cortes con estado (pasado/vigente/futuro) y el valor que rige hoy. */
  protected cortesVista(
    valor: CorteFecha[] | string | null | undefined,
    key: 'horas_semanales' | 'pct',
  ): CortesVista {
    const hoy = this.hoy();
    const list = this.cortes(valor).filter((c) => c[key] !== undefined && c[key] !== null);
    const historial: CorteVista[] = list.map((c, i) => {
      const siguiente = list[i + 1]?.desde ?? null;
      const estado = c.desde > hoy ? 'futuro' : siguiente && siguiente <= hoy ? 'pasado' : 'vigente';
      return {
        valor: Number(c[key]),
        desde: c.desde,
        hasta: siguiente ? this.ayer(siguiente) : null,
        estado,
      };
    });
    const actual = historial.find((c) => c.estado === 'vigente') ?? null;
    return { actual, historial };
  }

  // ── Utilidades de fecha ────────────────────────────────────────────────────

  protected hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  protected ayer(fecha: string): string {
    const d = new Date(`${fecha}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  protected fechaCorta(fecha: string): string {
    return FECHA_CORTA.format(new Date(`${fecha}T00:00:00Z`));
  }

  protected fechaLarga(fecha: string): string {
    return FECHA_LARGA.format(new Date(`${fecha}T00:00:00Z`));
  }

  protected diaSemana(fecha: string): string {
    const dia = DIA_SEMANA.format(new Date(`${fecha}T00:00:00Z`));
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  }
}
