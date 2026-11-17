import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AmenityDto, ReservarAmenityPortalCommand } from '../../../../../core/api/interfaces/amenities.interfaces';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { InputHoraComponent } from '../../../../ui/input-hora/input-hora.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

const DIAS_POR_NOMBRE: Record<string, number> = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
};

const PAGOS: readonly SelectOption[] = [
  { value: 'SENA', label: 'Pagar seña' },
  { value: 'TOTAL', label: 'Pagar total' },
];

@Component({
  selector: 'app-formulario-reserva-amenity',
  standalone: true,
  imports: [InputFechaComponent, InputHoraComponent, SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-reserva-amenity.component.html',
  styleUrl: './formulario-reserva-amenity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioReservaAmenityComponent {
  readonly amenity = input.required<AmenityDto>();
  readonly enviado = output<ReservarAmenityPortalCommand>();

  protected readonly pagos = PAGOS;
  protected readonly fecha = signal('');
  protected readonly horaDesde = signal('');
  protected readonly horaHasta = signal('');
  protected readonly tipoPago = signal<'SENA' | 'TOTAL'>('SENA');
  protected readonly esGratuito = computed(() => this.amenity().montoHora === 0);
  protected readonly mensajeError = signal('');
  protected readonly minimo = this.fechaDeHoy();
  protected readonly diasPermitidos = computed(() => this.amenity().diasSemana
    .split(/[;,]/)
    .map((item) => DIAS_POR_NOMBRE[item.trim().toUpperCase()])
    .filter((dia): dia is number => dia !== undefined));

  protected actualizarFecha(valor: string): void {
    this.fecha.set(valor);
    this.mensajeError.set('');
  }

  protected actualizarHoraDesde(valor: string): void {
    const horaDesde = this.normalizarHoraEnRango(valor);
    this.horaDesde.set(horaDesde);
    this.mensajeError.set('');
    if (!horaDesde) return;
    this.horaHasta.set(this.calcularFinAutomatico(horaDesde));
  }

  protected actualizarHoraHasta(valor: string): void {
    this.horaHasta.set(this.normalizarHoraEnRango(valor));
    this.mensajeError.set('');
  }

  protected seleccionarTipoPago(valor: string): void {
    if (valor === 'SENA' || valor === 'TOTAL') this.tipoPago.set(valor);
  }

  protected enviar(): void {
    const desde = this.fechaHora(this.horaDesde());
    const hasta = this.fechaHora(this.horaHasta());
    const error = this.validar(desde, hasta);
    if (error) {
      this.mensajeError.set(error);
      return;
    }

    this.mensajeError.set('');
    this.enviado.emit({
      fechaDesde: `${desde}:00`,
      fechaHasta: `${hasta}:00`,
      tipoPago: this.esGratuito() ? 'TOTAL' : this.tipoPago(),
    });
  }

  private validar(desde: string, hasta: string): string {
    if (!desde || !hasta) return 'Completá la fecha y hora de inicio y finalización.';
    if (!this.esInicioValido(desde)) return 'El inicio debe estar dentro de los días y horarios disponibles.';
    if (!this.esFinValido(hasta)) return 'El fin debe estar dentro del horario disponible del amenity.';
    if (hasta <= desde) return 'La fecha final debe ser posterior a la inicial.';
    if (desde.slice(0, 10) !== hasta.slice(0, 10)) return 'La reserva debe comenzar y finalizar el mismo día.';
    return '';
  }

  private esInicioValido(valor: string): boolean {
    return this.esDiaPermitido(valor) && this.estaEntreHoras(valor, this.horaInicio(), this.horaFin());
  }

  private esFinValido(valor: string): boolean {
    return this.esDiaPermitido(valor) && this.estaEntreHoras(valor, this.horaInicio(), this.horaFin());
  }

  private calcularFinAutomatico(horaDesde: string): string {
    const [horas, minutos] = horaDesde.split(':').map(Number);
    const horaFin = this.horaFin();
    const finUnaHora = `${String(horas + 1).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    return finUnaHora > horaFin ? horaFin : finUnaHora;
  }

  /** Asegura el rango aunque la hora haya sido escrita manualmente en el navegador. */
  private normalizarHoraEnRango(hora: string): string {
    if (!hora) return '';
    if (hora < this.horaInicio()) return this.horaInicio();
    if (hora > this.horaFin()) return this.horaFin();
    return hora;
  }

  private esDiaPermitido(valor: string): boolean {
    const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    return this.amenity().diasSemana
      .split(/[;,]/)
      .map((item) => item.trim().toUpperCase())
      .some((item) => DIAS_POR_NOMBRE[item] === diaSemana);
  }

  private estaEntreHoras(valor: string, inicio: string, fin: string): boolean {
    const fecha = valor.slice(0, 10);
    return valor >= `${fecha}T${inicio}` && valor <= `${fecha}T${fin}`;
  }

  private horaInicio(): string { return this.amenity().horaInicio.slice(0, 5); }
  private horaFin(): string { return this.amenity().horaFin.slice(0, 5); }
  private fechaHora(hora: string): string { return this.fecha() && hora ? `${this.fecha()}T${hora}` : ''; }

  private fechaDeHoy(): string {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }
}
