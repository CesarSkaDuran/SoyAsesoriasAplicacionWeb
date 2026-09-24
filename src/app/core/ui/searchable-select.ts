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
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.css',
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
