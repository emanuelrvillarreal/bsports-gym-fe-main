import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  OPCIONES_PERIODICIDAD_CUOTA,
  PERIODICIDAD_CUOTA_PREDETERMINADA,
  type PeriodicidadCuota,
} from '../../../../core/api/interfaces/periodicidad-cuota.interfaces';
import {
  PerfilEmpresaDto,
  RecargoTipo,
} from '../../../../core/api/interfaces/empresa.interfaces';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { SelectComponent } from '../../../ui/select/select.component';
import { SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export interface ActualizarPlazosOperativosPayload {
  readonly periodicidadCuotaSocial: PeriodicidadCuota;
  readonly diasVencimientoCuota: number;
  readonly diasVencimientoMoroso?: number;
  readonly diasInhabilitacion?: number;
  readonly recargoHabilitado: boolean;
  readonly recargoTipo?: RecargoTipo;
  readonly recargoValor?: number;
  readonly recargoDiasGracia: number;
}

@Component({
  selector: 'app-formulario-plazos-operativos',
  standalone: true,
  imports: [BotonComponent, CardComponent, SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-plazos-operativos.component.html',
  styleUrl: './formulario-plazos-operativos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioPlazosOperativosComponent implements OnDestroy {
  readonly perfil = input<PerfilEmpresaDto | null>(null);
  readonly bloqueado = input(false);
  readonly cargando = input(false);
  readonly enviado = output<ActualizarPlazosOperativosPayload>();

  protected readonly opcionesPeriodicidad: readonly SelectOption[] =
    OPCIONES_PERIODICIDAD_CUOTA.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta }));
  protected readonly periodicidad = signal<PeriodicidadCuota>(PERIODICIDAD_CUOTA_PREDETERMINADA);
  protected readonly diasVencimientoCuota = signal('10');
  protected readonly diasVencimientoMoroso = signal('');
  protected readonly diasInhabilitacion = signal('');
  protected readonly opcionesRecargoTipo: readonly SelectOption[] = [
    { value: 'FIJO', label: 'Monto fijo ($)' },
    { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
  ];
  protected readonly recargoHabilitado = signal(false);
  protected readonly recargoTipo = signal<RecargoTipo>('FIJO');
  protected readonly recargoValor = signal('');
  protected readonly recargoDiasGracia = signal('0');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const perfil = this.perfil();
      const periodicidad = OPCIONES_PERIODICIDAD_CUOTA.find(
        (opcion) => opcion.valor === perfil?.periodicidadCuotaSocial,
      );
      this.periodicidad.set(periodicidad?.valor ?? PERIODICIDAD_CUOTA_PREDETERMINADA);
      this.diasVencimientoCuota.set(perfil?.diasVencimientoCuota?.toString() ?? '10');
      this.diasVencimientoMoroso.set(perfil?.diasVencimientoMoroso?.toString() ?? '');
      this.diasInhabilitacion.set(perfil?.diasInhabilitacion?.toString() ?? '');
      this.recargoHabilitado.set(perfil?.recargoHabilitado ?? false);
      this.recargoTipo.set(perfil?.recargoTipo ?? 'FIJO');
      this.recargoValor.set(perfil?.recargoValor?.toString() ?? '');
      this.recargoDiasGracia.set(perfil?.recargoDiasGracia?.toString() ?? '0');
      this.limpiarError();
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected seleccionarPeriodicidad(valor: string): void {
    if (OPCIONES_PERIODICIDAD_CUOTA.some((opcion) => opcion.valor === valor)) {
      this.periodicidad.set(valor as PeriodicidadCuota);
    }
  }

  protected alternarRecargo(evento: Event): void {
    this.recargoHabilitado.set((evento.target as HTMLInputElement).checked);
  }

  protected seleccionarRecargoTipo(valor: string): void {
    if (valor === 'FIJO' || valor === 'PORCENTAJE') this.recargoTipo.set(valor);
  }

  protected recargoValorInvalido(): boolean {
    if (!this.recargoHabilitado()) return false;
    const texto = this.recargoValor().trim();
    const numero = Number(texto);
    if (!texto || !Number.isFinite(numero) || numero <= 0) return true;
    return this.recargoTipo() === 'PORCENTAJE' && numero > 100;
  }

  protected recargoGraciaInvalida(): boolean {
    const texto = this.recargoDiasGracia().trim();
    if (!texto) return false;
    const numero = Number(texto);
    return !Number.isInteger(numero) || numero < 0;
  }

  protected actualizarNumero(
    campo:
      | 'diasVencimientoCuota'
      | 'diasVencimientoMoroso'
      | 'diasInhabilitacion'
      | 'recargoValor'
      | 'recargoDiasGracia',
    evento: Event,
  ): void {
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected diasInvalidos(valor: string, requerido = false): boolean {
    const texto = valor.trim();
    if (!texto) return requerido;
    const numero = Number(texto);
    return !Number.isInteger(numero) || numero < 1;
  }

  protected guardar(): void {
    if (
      this.diasInvalidos(this.diasVencimientoCuota(), true) ||
      this.diasInvalidos(this.diasVencimientoMoroso()) ||
      this.diasInvalidos(this.diasInhabilitacion())
    ) {
      this.mostrarError('Ingresá una cantidad de días entera y mayor a cero.');
      return;
    }

    if (this.recargoValorInvalido()) {
      this.mostrarError(
        this.recargoTipo() === 'PORCENTAJE'
          ? 'Ingresá un porcentaje de recargo mayor a 0 y hasta 100.'
          : 'Ingresá un monto de recargo mayor a cero.',
      );
      return;
    }
    if (this.recargoGraciaInvalida()) {
      this.mostrarError('Los días de gracia del recargo deben ser un entero de cero o más.');
      return;
    }

    this.limpiarError();
    const recargoValor = this.recargoValor().trim();
    this.enviado.emit({
      recargoHabilitado: this.recargoHabilitado(),
      recargoTipo: this.recargoTipo(),
      ...(recargoValor ? { recargoValor: Number(recargoValor) } : {}),
      recargoDiasGracia: Number(this.recargoDiasGracia().trim() || '0'),
      periodicidadCuotaSocial: this.periodicidad(),
      diasVencimientoCuota: Number(this.diasVencimientoCuota().trim()),
      ...this.crearCampoOpcional('diasVencimientoMoroso', this.diasVencimientoMoroso()),
      ...this.crearCampoOpcional('diasInhabilitacion', this.diasInhabilitacion()),
    });
  }

  private crearCampoOpcional(
    campo: 'diasVencimientoMoroso' | 'diasInhabilitacion',
    valor: string,
  ): Partial<ActualizarPlazosOperativosPayload> {
    return valor.trim() ? { [campo]: Number(valor.trim()) } : {};
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), 5000);
  }

  private limpiarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
