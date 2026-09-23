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
  template: `
    <div class="flex h-full flex-col p-6 sm:p-10">
      <!-- Cabecera -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <a
            matIconButton
            routerLink="/admin/ventas"
          >
            <mat-icon svgIcon="arrow-left" />
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">{{ tablero()?.embudo?.nombre || 'Embudo' }}</h1>
            <p class="text-sm text-neutral-500">{{ tablero()?.embudo?.descripcion }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          @if (tablero(); as t) {
            <div class="hidden items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:flex">
              <span><strong>{{ t.totales.leads }}</strong> leads</span>
              <span class="text-sky-600"><strong>{{ t.totales.del_mes }}</strong> este mes</span>
              <span class="text-emerald-600"><strong>{{ t.totales.ganados }}</strong> ganados</span>
              <span class="text-red-500"><strong>{{ t.totales.perdidos }}</strong> perdidos</span>
            </div>
          }
          <button
            matButton="tonal"
            (click)="openEtapas()"
          >
            <mat-icon svgIcon="settings" />
            Etapas
          </button>
          <button
            matButton="filled"
            (click)="openLead()"
          >
            <mat-icon svgIcon="plus" />
            Nuevo lead
          </button>
        </div>
      </div>

      <!-- Buscador -->
      <mat-form-field
        class="mb-4 w-80"
        appearance="outline"
        subscriptSizing="dynamic"
      >
        <mat-icon svgIcon="search" matIconPrefix />
        <input
          matInput
          [formControl]="searchControl"
          placeholder="Buscar lead, empresa, email…"
        />
      </mat-form-field>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <mat-spinner diameter="48" />
        </div>
      } @else if (tablero(); as t) {
        <!-- Tablero Kanban -->
        <div
          class="flex flex-1 items-start gap-4 overflow-x-auto pb-4"
          cdkDropListGroup
        >
          @for (etapa of t.etapas; track etapa.id) {
            <div class="flex w-80 flex-shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <!-- Cabecera columna -->
              <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full {{ etapaColor($index) }}"></span>
                  <span class="text-sm font-semibold">{{ etapa.nombre }}</span>
                  <span class="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    {{ etapa.total }}
                  </span>
                </div>
                <button
                  matIconButton
                  (click)="openLead(etapa)"
                  title="Nuevo lead aquí"
                >
                  <mat-icon svgIcon="plus" />
                </button>
              </div>
              @if (etapa.descripcion) {
                <div class="px-4 pb-2 text-xs text-neutral-500">{{ etapa.descripcion }}</div>
              }

              <!-- Tarjetas -->
              <div
                cdkDropList
                [id]="'etapa-' + etapa.id"
                [cdkDropListData]="etapa.leads!"
                class="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-3 pt-1"
                (cdkDropListDropped)="drop($event, etapa)"
              >
                @for (lead of etapa.leads; track lead.id) {
                  <div
                    cdkDrag
                    class="cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-900"
                    (click)="openLead(undefined, lead)"
                  >
                    <div class="mb-1 flex items-start justify-between gap-2">
                      <div class="font-medium leading-tight">{{ lead.empresa || lead.nombre }}</div>
                      @if (lead.empresa_id || lead.persona_id) {
                        <mat-icon
                          svgIcon="user-round-check"
                          class="!h-4 !w-4 flex-shrink-0 text-emerald-500"
                        />
                      }
                    </div>
                    @if (lead.empresa) {
                      <div class="text-xs text-neutral-500">{{ lead.nombre }}</div>
                    }
                    <div class="mt-2 flex items-center justify-between text-xs text-neutral-400">
                      <div class="flex items-center gap-2">
                        @if (lead.fuente) {
                          <span class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{{ lead.fuente }}</span>
                        }
                        @if (lead.asignado_nombre) {
                          <span class="flex items-center gap-1">
                            <mat-icon svgIcon="user" class="!h-3.5 !w-3.5" />
                            {{ lead.asignado_nombre }}
                          </span>
                        }
                      </div>
                      <span>{{ lead.created_at | date: 'dd/MM/yy' }}</span>
                    </div>
                    @if (lead.notas) {
                      <div class="mt-2 line-clamp-2 border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800">
                        {{ lead.notas }}
                      </div>
                    }
                  </div>
                }

                @if (!etapa.leads?.length) {
                  <div class="rounded-lg border-2 border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400 dark:border-neutral-700">
                    Arrastra leads aquí
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      border-radius: 0.5rem;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating {
      transition: transform 200ms ease;
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 200ms ease;
    }
  `,
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
