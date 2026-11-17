import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroEye, heroEyeSlash } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-input-password',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({ heroEye, heroEyeSlash }),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputPasswordComponent),
      multi: true,
    },
  ],
  templateUrl: './input-password.component.html',
  styleUrl: './input-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPasswordComponent implements ControlValueAccessor {
  readonly etiqueta = input('');
  readonly placeholder = input('');
  readonly autocomplete = input('current-password');
  readonly ariaLabel = input('Contraseña');
  readonly id = input('');
  readonly requerido = input(false);
  readonly colorPrimario = input('var(--app-accent)');
  readonly valorCambiado = output<string>();

  protected readonly visible = signal(false);
  protected valor = '';
  protected deshabilitado = false;
  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(valor: string | null): void {
    this.valor = valor ?? '';
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
  }

  protected alternarVisibilidad(): void {
    if (!this.deshabilitado) {
      this.visible.update((visible) => !visible);
    }
  }

  protected cambiarValor(evento: Event): void {
    this.valor = (evento.target as HTMLInputElement).value;
    this.onChange(this.valor);
    this.valorCambiado.emit(this.valor);
  }

  protected marcarTocado(): void {
    this.onTouched();
  }
}
