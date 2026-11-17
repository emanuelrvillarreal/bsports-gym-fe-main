import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  DescuentoDto,
  GuardarDescuentoPayload,
  TipoValorDescuento,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';
import { formatearMoneda } from '../../../../helpers/moneda-formato';

@Component({
  selector: 'app-formulario-descuento',
  standalone: true,
  imports: [SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-descuento.component.html',
  styleUrl: './formulario-descuento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioDescuentoComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly descuento = input<DescuentoDto | null>(null);
  readonly enviado = output<GuardarDescuentoPayload>();

  protected readonly titulo = signal('');
  protected readonly tipoValor = signal<TipoValorDescuento | ''>('');
  protected readonly porcentaje = signal('');
  protected readonly montoFijo = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  protected readonly esPorcentaje = computed(() => this.tipoValor() === 'PORCENTAJE');
  protected readonly esMontoFijo = computed(() => this.tipoValor() === 'MONTO_FIJO');
  protected readonly opcionesTipo: readonly SelectOption[] = [
    { value: 'PORCENTAJE', label: 'Porcentaje' },
    { value: 'MONTO_FIJO', label: 'Monto fijo' },
  ];
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const descuento = this.descuento();
      this.titulo.set(descuento?.titulo ?? '');
      this.tipoValor.set(descuento?.tipoValor ?? '');
      this.porcentaje.set(
        descuento?.porcentaje === null || descuento?.porcentaje === undefined
          ? ''
          : String(descuento.porcentaje),
      );
      this.montoFijo.set(
        descuento?.montoFijo === null || descuento?.montoFijo === undefined
          ? ''
          : String(descuento.montoFijo),
      );
      this.ocultarError();
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTitulo(evento: Event): void {
    this.titulo.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarTipo(valor: string): void {
    if (valor !== 'PORCENTAJE' && valor !== 'MONTO_FIJO') return;
    this.tipoValor.set(valor);
    if (valor === 'PORCENTAJE') this.montoFijo.set('');
    if (valor === 'MONTO_FIJO') this.porcentaje.set('');
  }

  protected actualizarPorcentaje(evento: Event): void {
    this.porcentaje.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarMontoFijo(evento: Event): void {
    this.montoFijo.set((evento.target as HTMLInputElement).value.replace(/[^0-9]/g, ''));
  }

  protected formatearMontoFijo(): string {
    return this.montoFijo() ? formatearMoneda(this.montoFijo()) : '';
  }

  protected enviar(): void {
    const titulo = this.titulo().trim();
    const tipoValor = this.tipoValor();
    if (!titulo || !tipoValor) {
      this.mostrarError('Completá el título y el tipo de descuento.');
      return;
    }

    const valorCrudo = tipoValor === 'PORCENTAJE' ? this.porcentaje() : this.montoFijo();
    const valor = Number(valorCrudo);
    const valorInvalido =
      !valorCrudo.trim() ||
      !Number.isFinite(valor) ||
      (tipoValor === 'PORCENTAJE' ? valor < 0 : valor <= 0);
    if (valorInvalido) {
      this.mostrarError(
        tipoValor === 'PORCENTAJE'
          ? 'El porcentaje debe estar entre 0 y 100.'
          : 'El monto fijo debe ser mayor a 0.',
      );
      return;
    }
    if (tipoValor === 'PORCENTAJE' && valor > 100) {
      this.mostrarError('El porcentaje no puede superar 100.');
      return;
    }

    this.ocultarError();
    this.enviado.emit({
      titulo,
      tipoValor,
      porcentaje: tipoValor === 'PORCENTAJE' ? valor : null,
      montoFijo: tipoValor === 'MONTO_FIJO' ? valor : null,
    });
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private ocultarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
