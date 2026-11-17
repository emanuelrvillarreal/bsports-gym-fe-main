import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

import { BotonComponent } from '../boton/boton.component';

@Component({
  selector: 'app-input-periodo',
  standalone: true,
  imports: [BotonComponent, NgIcon],
  providers: [
    provideIcons({ heroXMark }),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputPeriodoComponent),
      multi: true,
    },
  ],
  templateUrl: './input-periodo.component.html',
  styleUrl: './input-periodo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPeriodoComponent implements ControlValueAccessor {
  readonly etiqueta = input('Período');
  readonly ariaLabel = input('Filtrar por período');
  readonly colorPrimario = input('var(--app-accent)');
  readonly valorCambiado = output<string>();

  protected readonly mes = signal('');
  protected readonly anio = signal('');
  protected readonly anioMaximo = new Date().getFullYear();
  protected readonly deshabilitado = signal(false);
  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(valor: string | null): void {
    const coincidencia = /^(0[1-9]|1[0-2])-(\d{4})$/.exec(valor ?? '');
    this.mes.set(coincidencia?.[1] ?? '');
    this.anio.set(coincidencia?.[2] ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(deshabilitado: boolean): void { this.deshabilitado.set(deshabilitado); }

  protected actualizarMes(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '').slice(0, 2);
    if (valor && (Number(valor) < 1 || Number(valor) > 12)) {
      input.value = this.mes();
      return;
    }

    input.value = valor;
    this.mes.set(valor);
    this.emitirSiCompleto();
  }

  protected actualizarAnio(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '').slice(0, 4);
    if (valor.length === 4 && Number(valor) > this.anioMaximo) {
      input.value = this.anio();
      return;
    }

    input.value = valor;
    this.anio.set(valor);
    this.emitirSiCompleto();
  }

  protected limpiar(): void {
    if (!this.tieneValor()) return;
    this.mes.set('');
    this.anio.set('');
    this.emitir('');
  }

  protected marcarTocado(): void { this.onTouched(); }
  protected tieneValor(): boolean { return !!this.mes() || !!this.anio(); }

  private emitirSiCompleto(): void {
    const mes = Number(this.mes());
    if (this.anio().length === 4 && mes >= 1 && mes <= 12) {
      this.emitir(`${String(mes).padStart(2, '0')}-${this.anio()}`);
    }
  }

  private emitir(valor: string): void {
    this.onChange(valor);
    this.valorCambiado.emit(valor);
  }
}
