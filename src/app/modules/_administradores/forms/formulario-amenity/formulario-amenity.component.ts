import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { DiaSemana } from '../../../../core/api/interfaces/actividades.interfaces';
import {
  AmenityDto,
  GuardarAmenityCommand,
} from '../../../../core/api/interfaces/amenities.interfaces';
import { formatearMoneda, normalizarValorMoneda } from '../../../../helpers/moneda-formato';
import { InputHoraComponent } from '../../../ui/input-hora/input-hora.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-amenity',
  standalone: true,
  imports: [InputHoraComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-amenity.component.html',
  styleUrl: './formulario-amenity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioAmenityComponent implements OnDestroy {
  readonly amenity = input<AmenityDto | null>(null);
  readonly duracionErrorMs = input(5000);
  readonly enviado = output<GuardarAmenityCommand>();

  protected readonly nombre = signal('');
  protected readonly montoHora = signal('');
  protected readonly porcentajeSena = signal('');
  protected readonly gratuito = signal(false);
  protected readonly diasSeleccionados = signal<readonly DiaSemana[]>([]);
  protected readonly horaInicio = signal('');
  protected readonly horaFin = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly dias: readonly DiaSemana[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
  ];

  constructor() {
    effect(() => {
      const amenity = this.amenity();
      this.nombre.set(amenity?.nombre ?? '');
      this.montoHora.set(amenity ? formatearMoneda(amenity.montoHora) : '');
      this.porcentajeSena.set(amenity ? String(amenity.porcentajeSena) : '');
      this.gratuito.set(amenity?.montoHora === 0);
      this.diasSeleccionados.set(
        amenity
          ? amenity.diasSemana
              .split(';')
              .filter((dia): dia is DiaSemana => this.dias.includes(dia as DiaSemana))
          : [],
      );
      this.horaInicio.set(amenity?.horaInicio.slice(0, 5) ?? '');
      this.horaFin.set(amenity?.horaFin.slice(0, 5) ?? '');
      this.limpiarError();
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarNombre(evento: Event): void {
    this.nombre.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarMonto(evento: Event): void {
    this.montoHora.set((evento.target as HTMLInputElement).value);
  }

  protected formatearMonto(): void {
    const valor = this.montoHora().trim();
    if (!valor) return;
    this.montoHora.set(formatearMoneda(normalizarValorMoneda(valor)));
  }

  protected actualizarSena(evento: Event): void {
    this.porcentajeSena.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarGratuidad(evento: Event): void {
    const gratuito = (evento.target as HTMLInputElement).checked;
    this.gratuito.set(gratuito);
    this.montoHora.set(gratuito ? '$0' : '');
    this.porcentajeSena.set(gratuito ? '0' : '');
  }

  protected alternarDia(dia: DiaSemana, seleccionado: boolean): void {
    this.diasSeleccionados.update((dias) =>
      seleccionado ? [...new Set([...dias, dia])] : dias.filter((actual) => actual !== dia),
    );
  }

  protected esAmenityGratuito(): boolean {
    return this.gratuito();
  }

  protected normalizarMontoInvalido(): boolean {
    const valor = this.obtenerMontoHora();
    const texto = this.montoHora().trim();
    return (
      !/^[$\s\d.,]+$/.test(texto) ||
      !/\d/.test(texto) ||
      !Number.isFinite(valor) ||
      valor < 0 || (!this.esAmenityGratuito() && valor <= 0)
    );
  }

  protected porcentajeSenaInvalido(): boolean {
    const porcentaje = this.esAmenityGratuito() ? 0 : Number(this.porcentajeSena());
    return !Number.isFinite(porcentaje) || (this.esAmenityGratuito() ? porcentaje !== 0 : porcentaje < 1 || porcentaje > 100);
  }

  protected enviar(): void {
    const montoHora = this.obtenerMontoHora();
    const esGratuito = this.esAmenityGratuito();
    const porcentajeSena = esGratuito ? 0 : Number(this.porcentajeSena());

    if (
      !this.nombre().trim() ||
      !this.diasSeleccionados().length ||
      !this.horaInicio() ||
      !this.horaFin() ||
      this.normalizarMontoInvalido() ||
      !Number.isFinite(montoHora) ||
      montoHora < 0 || (!esGratuito && montoHora <= 0) ||
      !Number.isFinite(porcentajeSena) ||
      (esGratuito ? porcentajeSena !== 0 : porcentajeSena < 1 || porcentajeSena > 100)
    ) {
      this.mostrarError('Completá los campos y verificá el monto y la seña.');
      return;
    }
    if (this.horaFin() <= this.horaInicio()) {
      this.mostrarError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    this.limpiarError();
    this.enviado.emit({
      nombre: this.nombre().trim(),
      montoHora,
      porcentajeSena,
      diasSemana: this.diasSeleccionados().join(';'),
      horaInicio: `${this.horaInicio()}:00`,
      horaFin: `${this.horaFin()}:00`,
    });
  }

  private obtenerMontoHora(): number {
    return normalizarValorMoneda(this.montoHora());
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
