import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

import {
  EventoAccesoAltaCommand,
  EventoAccesoDetalleDto,
} from '../../../../core/api/interfaces/eventos-acceso.interfaces';
import { fechaApiAFechaInput } from '../../../../helpers/fecha-api';
import { formatearMoneda, normalizarValorMoneda } from '../../../../helpers/moneda-formato';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-evento-acceso',
  standalone: true,
  imports: [InputFechaComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-evento-acceso.component.html',
  styleUrl: './formulario-evento-acceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioEventoAccesoComponent {
  readonly formId = input('formulario-evento-acceso');
  readonly valorInicial = input<EventoAccesoDetalleDto | null>(null);
  readonly reinicioVersion = input(0);
  readonly enviado = output<EventoAccesoAltaCommand>();

  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly fechaMinima = this.formatearFechaMinima(new Date());
  protected readonly fecha = signal(this.fechaMinima);
  protected readonly monto = signal(0);
  protected readonly montoMorosos = signal(0);
  protected readonly montoInvitados = signal(0);
  protected readonly permiteMorosos = signal(true);
  protected readonly permiteInvitados = signal(true);
  protected readonly intentoEnvio = signal(false);

  constructor() {
    effect(() => {
      this.reinicioVersion();
      const valor = this.valorInicial();
      this.titulo.set(valor?.titulo ?? '');
      this.descripcion.set(valor?.descripcion ?? '');
      this.fecha.set(this.normalizarFecha(valor?.fecha) || this.fechaMinima);
      this.monto.set(valor?.monto ?? 0);
      this.montoMorosos.set(valor?.montoMorosos ?? 0);
      this.montoInvitados.set(valor?.montoInvitados ?? 0);
      this.permiteMorosos.set(valor?.permiteMorosos ?? true);
      this.permiteInvitados.set(valor?.permiteInvitados ?? true);
      this.intentoEnvio.set(false);
    });
  }

  protected enviar(): void {
    this.intentoEnvio.set(true);
    if (this.formularioInvalido()) return;

    const command: EventoAccesoAltaCommand = {
      titulo: this.titulo().trim(),
      descripcion: this.descripcion().trim(),
      monto: Number(this.monto()),
      montoMorosos: this.permiteMorosos() ? Number(this.montoMorosos()) : 1,
      montoInvitados: this.permiteInvitados() ? Number(this.montoInvitados()) : 1,
      permiteMorosos: this.permiteMorosos(),
      permiteInvitados: this.permiteInvitados(),
    };
    this.enviado.emit({ ...command, fecha: this.formatearFechaHoraApi(this.fecha()) });
  }

  protected formularioInvalido(): boolean {
    return (
      !this.tituloValido() ||
      !this.fechaValida() ||
      !this.descripcionValida() ||
      !this.montoValido(this.monto(), true) ||
      (this.permiteMorosos() && !this.montoValido(this.montoMorosos())) ||
      (this.permiteInvitados() && !this.montoValido(this.montoInvitados()))
    );
  }

  protected tituloValido(): boolean {
    const titulo = this.titulo().trim();
    return titulo.length > 0 && titulo.length <= 120;
  }

  protected descripcionValida(): boolean {
    const descripcion = this.descripcion().trim();
    return descripcion.length > 0 && descripcion.length <= 500;
  }

  protected fechaValida(): boolean {
    return !!this.fecha();
  }

  protected montoValido(monto: number, permiteCero = false): boolean {
    return (
      Number.isFinite(Number(monto)) &&
      (permiteCero ? Number(monto) >= 0 : Number(monto) > 0)
    );
  }

  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  protected actualizarMonto(
    campo: 'monto' | 'montoMorosos' | 'montoInvitados',
    evento: Event,
  ): void {
    this[campo].set(normalizarValorMoneda((evento.target as HTMLInputElement).value));
  }

  protected formatearInputMonto(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    campo.value = formatearMoneda(campo.value);
  }

  private formatearFechaMinima(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
      fecha.getDate(),
    ).padStart(2, '0')}`;
  }

  private normalizarFecha(valor: EventoAccesoDetalleDto['fecha']): string {
    if (Array.isArray(valor) && valor.length >= 3) {
      const [anio, mes, dia] = valor;
      if ([anio, mes, dia].every((parte) => Number.isInteger(parte))) {
        return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      }
    }

    return typeof valor === 'string' ? fechaApiAFechaInput(valor.trim()) : '';
  }

  private formatearFechaHoraApi(fecha: string): string {
    return `${fecha}T00:00`;
  }
}
