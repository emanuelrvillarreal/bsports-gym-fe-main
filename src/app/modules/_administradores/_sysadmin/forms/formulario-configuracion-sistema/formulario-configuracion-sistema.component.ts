import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { ConfiguracionGuardarPayload } from '../../../../../core/api/interfaces/configuracion.interfaces';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-configuracion-sistema',
  standalone: true,
  imports: [ValidacionFormularioDirective],
  templateUrl: './formulario-configuracion-sistema.component.html',
  styleUrl: './formulario-configuracion-sistema.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioConfiguracionSistemaComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly valorInicial = input<ConfiguracionGuardarPayload | null>(null);
  readonly enviado = output<ConfiguracionGuardarPayload>();

  protected readonly nombre = signal('');
  protected readonly valor = signal('');
  protected readonly global = signal(false);
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const inicial = this.valorInicial();
      this.nombre.set(inicial?.name ?? '');
      this.valor.set(inicial?.value ?? '');
      this.global.set(inicial?.global ?? false);
      this.limpiarTimeoutError();
      this.errorVisible.set(false);
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarNombre(evento: Event): void {
    this.nombre.set((evento.target as HTMLInputElement).value.slice(0, 160));
  }

  protected actualizarValor(evento: Event): void {
    this.valor.set((evento.target as HTMLTextAreaElement).value);
  }

  protected actualizarGlobal(evento: Event): void {
    this.global.set((evento.target as HTMLInputElement).checked);
  }

  protected enviar(): void {
    const name = this.nombre().trim();
    const value = this.valor().trim();
    if (!name || !value) {
      this.mostrarError('Completá la clave y el valor de la configuración.');
      return;
    }

    this.limpiarTimeoutError();
    this.errorVisible.set(false);
    this.enviado.emit({ name, value, global: this.global() });
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
