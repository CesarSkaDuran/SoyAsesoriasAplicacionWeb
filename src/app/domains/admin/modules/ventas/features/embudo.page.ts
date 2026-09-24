import { DatePipe } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { EmbudoTablero, Etapa, Lead } from '@/app/models/negocio.model';
import { LeadFormDialog } from '../components/lead-form.dialog';
import { EtapaFormDialog } from '../components/etapa-form.dialog';

const ETAPA_COLORS = [
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-emerald-500',
  'bg-red-400',
];

@Component({
  selector: 'embudo-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DragDropModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatIcon,
    MatProgressSpinner,
    DatePipe,
  ],
  templateUrl: './embudo.page.html',
  styleUrl: './embudo.page.css',
})
export default class EmbudoPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  creds = inject(CredentialsService);

  tablero = signal<EmbudoTablero | null>(null);
  loading = signal(true);
  slug = '';

  searchControl = new FormControl('');

  constructor() {
    this.slug = this.route.snapshot.paramMap.get('slug') || 'clientes';
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load());
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .ventasEmbudo(this.slug, this.searchControl.value || undefined)
      .subscribe({
        next: (r) => {
          this.tablero.set(r);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  etapaColor = (i: number) => ETAPA_COLORS[i % ETAPA_COLORS.length];

  drop(event: CdkDragDrop<Lead[]>, etapaDestino: Etapa) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const lead = event.previousContainer.data[event.previousIndex];
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    lead.etapa_id = etapaDestino.id;

    this.api.moveLead(lead.id, etapaDestino.id, event.currentIndex).subscribe({
      next: () => this.load(),
      error: (e) => {
        this.snack.open(e?.error?.message || 'No se pudo mover el lead', 'Cerrar', { duration: 3000 });
        this.load();
      },
    });
  }

  openLead(etapa?: Etapa, lead?: Lead) {
    const t = this.tablero();
    if (!t) return;
    this.dialog
      .open(LeadFormDialog, {
        width: '640px',
        data: {
          embudo: t.embudo,
          etapas: t.etapas,
          etapaId: etapa?.id ?? lead?.etapa_id,
          lead: lead ?? null,
          isAdmin: this.creds.isAdmin(),
        },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEtapas() {
    const t = this.tablero();
    if (!t) return;
    this.dialog
      .open(EtapaFormDialog, {
        width: '560px',
        data: { embudo: t.embudo, etapas: t.etapas },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }
}
