import { Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

/**
 * Selector con buscador integrado — reemplazo drop-in de
 * `<mat-form-field><mat-select>` para listados grandes (empresas,
 * terceros, empleados, ciudades…).
 *
 * Uso idéntico a un mat-select: acepta [formControl] / formControlName.
 *
 * ```html
 * <searchable-select
 *   label="Empresa"
 *   [items]="empresas()"
 *   displayKey="razon_social"
 *   formControlName="empresa_id"
 * />
 * ```
 */
@Component({
  selector: 'searchable-select',
  imports: [MatFormFieldModule, MatSelectModule, MatIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelect),
      multi: true,
    },
  ],
  template: `
    <mat-form-field
      appearance="outline"
      subscriptSizing="dynamic"
      class="w-full"
    >
      <mat-label>{{ label() }}</mat-label>
      <mat-select
        [value]="value()"
        [compareWith]="compareWith()"
        [disabled]="disabled()"
        [required]="required()"
        panelClass="searchable-select-panel"
        (selectionChange)="select($event)"
        (openedChange)="onOpen($event)"
      >
        <div class="search-box">
          <div class="search-box__field">
            <mat-icon svgIcon="search" />
            <input
              type="text"
              [placeholder]="'Buscar ' + label().toLowerCase() + '…'"
              [value]="search()"
              (input)="search.set($any($event.target).value)"
              (click)="$event.stopPropagation()"
              (keydown)="$event.stopPropagation()"
            />
            @if (search()) {
              <button
                type="button"
                class="search-box__clear"
                (click)="search.set(''); $event.stopPropagation()"
              >
                <mat-icon svgIcon="x" />
              </button>
            }
          </div>
        </div>

        @if (nullLabel()) {
          <mat-option [value]="null">{{ nullLabel() }}</mat-option>
        }
        @for (item of filtered(); track trackBy(item)) {
          <mat-option [value]="val(item)">{{ display(item) }}</mat-option>
        }
        @if (!filtered().length) {
          <mat-option [disabled]="true">
            Sin resultados para «{{ search() }}»
          </mat-option>
        }
      </mat-select>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `
    .search-box {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 8px 12px 6px;
      margin-top: -8px;
      background: var(--mat-select-panel-background-color, #fff);
    }
    .search-box__field {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border: 1px solid var(--mat-sys-outline-variant, #d4d4d4);
      border-radius: 8px;
      font-size: 13px;
    }
    .search-box__field mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--mat-sys-on-surface-variant, #737373);
      flex-shrink: 0;
    }
    .search-box__field input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      color: inherit;
    }
    .search-box__clear {
      display: flex;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--mat-sys-on-surface-variant, #737373);
    }
    .search-box__clear mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }
  `,
})
export class SearchableSelect implements ControlValueAccessor {
  /** Etiqueta flotante del campo */
  label = input.required<string>();
  /** Lista de opciones (objetos) */
  items = input.required<readonly any[]>();
  /** Propiedad del item que se muestra como texto */
  displayKey = input.required<string>();
  /** Propiedad del item usada como valor (por defecto 'id'; '' = el item completo) */
  valueKey = input<string>('id');
  /** Texto de la opción "vacía" al inicio (ej: 'Todos', 'Sin seleccionar') */
  nullLabel = input<string | null>(null);
  /** Hint debajo del campo */
  hint = input<string>('');
  required = input<boolean>(false);
  compareWith = input<(a: unknown, b: unknown) => boolean>((a, b) => a === b);

  /** Re-emite la selección (útil para cascadas tipo departamento→ciudad) */
  selectionChange = output<any>();

  search = signal('');
  value = signal<unknown>(null);
  disabled = signal(false);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const items = this.items() ?? [];
    if (!q) return items;
    return items.filter((i) => this.display(i).toLowerCase().includes(q));
  });

  display = (item: any) => String(item?.[this.displayKey()] ?? '');
  val = (item: any) =>
    this.valueKey() ? item?.[this.valueKey()] : item;
  trackBy = (item: any) => this.val(item);

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  select(v: unknown) {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
    this.selectionChange.emit(v);
  }

  onOpen(open: boolean) {
    if (open) {
      this.search.set('');
      setTimeout(() => {
        document
          .querySelector<HTMLInputElement>('.searchable-select-panel input')
          ?.focus();
      });
    }
  }

  writeValue(v: unknown): void {
    this.value.set(v ?? null);
  }
  registerOnChange(fn: (v: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }
}
