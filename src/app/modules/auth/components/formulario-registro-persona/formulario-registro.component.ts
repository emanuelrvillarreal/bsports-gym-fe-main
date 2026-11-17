import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import {
  ModoRegistroTitular,
  RegistroPersonaPayload,
} from '../../interfaces/registro-persona.interface';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_TEXTO_PERSONA = /^[\p{L}' -]+$/u;

export type FormularioRegistroValor = RegistroPersonaPayload;

@Component({
  selector: 'app-formulario-registro',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, NgIcon, ValidacionFormularioDirective],
  templateUrl: './formulario-registro.component.html',
  styleUrl: './formulario-registro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioRegistroComponent implements OnDestroy {
  private temporizadorErrorFormulario: ReturnType<typeof setTimeout> | null = null;
  private ultimoMensajeErrorExterno = '';

  readonly textoBoton = input('Enviar solicitud');
  readonly cargando = input(false);
  readonly mensajeErrorExterno = input('');
  readonly duracionErrorMs = input(5000);
  readonly submitted = output<FormularioRegistroValor>();

  protected readonly modo = signal<ModoRegistroTitular>('usuario-nuevo');
  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly dni = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly mostrarPassword = signal(false);
  protected readonly submitInvalido = signal(false);
  protected readonly mensajeErrorVisible = signal('');

  constructor() {
    effect(() => this.manejarMensajeErrorExterno(this.mensajeErrorExterno()));
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadorError();
  }

  resetearFormulario(): void {
    this.modo.set('usuario-nuevo');
    this.nombre.set('');
    this.apellido.set('');
    this.dni.set('');
    this.email.set('');
    this.password.set('');
    this.telefono.set('');
    this.fechaNacimiento.set('');
    this.mostrarPassword.set(false);
    this.submitInvalido.set(false);
    this.limpiarMensajeError();
  }

  protected seleccionarModo(modo: ModoRegistroTitular): void {
    this.modo.set(modo);
    this.password.set('');
    this.mostrarPassword.set(false);
    this.limpiarMensajeError();
  }

  protected actualizarNombre(evento: Event): void {
    this.nombre.set(this.normalizarTextoPersona(evento, 30));
  }

  protected actualizarApellido(evento: Event): void {
    this.apellido.set(this.normalizarTextoPersona(evento, 30));
  }

  protected actualizarDni(evento: Event): void {
    this.dni.set(this.valorInput(evento));
  }

  protected actualizarEmail(evento: Event): void {
    this.email.set(this.valorInput(evento));
  }

  protected actualizarPassword(evento: Event): void {
    this.password.set(this.valorInput(evento));
  }

  protected actualizarTelefono(evento: Event): void {
    this.telefono.set(this.valorInput(evento));
  }

  protected actualizarFechaNacimiento(fechaNacimiento: string): void {
    this.fechaNacimiento.set(fechaNacimiento);
  }

  protected registrar(): void {
    const mensajeError = this.validar();
    if (mensajeError) {
      this.mostrarErrorTemporal(mensajeError);
      return;
    }

    const payload: RegistroPersonaPayload = {
      nombre: this.nombre().trim(),
      apellido: this.apellido().trim(),
      email: this.email().trim().toLowerCase(),
      ...(this.modo() === 'usuario-nuevo' ? { password: this.password() } : {}),
      ...(this.dni().trim() ? { dni: this.dni().trim() } : {}),
      ...(this.telefono().trim() ? { telefono: this.telefono().trim() } : {}),
      ...(this.fechaNacimiento() ? { fechaNacimiento: this.fechaNacimiento() } : {}),
    };

    this.limpiarMensajeError();
    this.submitted.emit(payload);
  }

  protected alternarPassword(): void {
    this.mostrarPassword.update((actual) => !actual);
  }

  protected nombreInvalido(): boolean {
    return !this.nombre().trim() || !PATRON_TEXTO_PERSONA.test(this.nombre().trim());
  }

  protected apellidoInvalido(): boolean {
    return !this.apellido().trim() || !PATRON_TEXTO_PERSONA.test(this.apellido().trim());
  }

  protected emailInvalido(): boolean {
    return !PATRON_EMAIL.test(this.email().trim());
  }

  protected passwordInvalida(): boolean {
    return this.modo() === 'usuario-nuevo' && !this.password().trim();
  }

  private validar(): string {
    if (this.nombreInvalido()) {
      return 'Ingresa un nombre valido usando solo letras.';
    }
    if (this.apellidoInvalido()) {
      return 'Ingresa un apellido valido usando solo letras.';
    }
    if (this.emailInvalido()) return 'Ingresa un email valido.';
    if (this.passwordInvalida()) {
      return 'Elegí una contraseña.';
    }
    return '';
  }

  private normalizarTextoPersona(evento: Event, longitudMaxima: number): string {
    const input = evento.target as HTMLInputElement;
    const valor = input.value
      .replace(/[^\p{L}' -]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trimStart()
      .slice(0, longitudMaxima);
    input.value = valor;
    return valor;
  }

  private valorInput(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  private manejarMensajeErrorExterno(mensaje: string): void {
    const mensajeLimpio = mensaje.trim();
    if (!mensajeLimpio) {
      this.ultimoMensajeErrorExterno = '';
      return;
    }
    if (mensajeLimpio === this.ultimoMensajeErrorExterno) return;

    this.ultimoMensajeErrorExterno = mensajeLimpio;
    this.mostrarErrorTemporal(mensajeLimpio);
  }

  private mostrarErrorTemporal(mensaje: string): void {
    this.limpiarTemporizadorError();
    this.mensajeErrorVisible.set(mensaje.trim());
    this.submitInvalido.set(true);
    this.temporizadorErrorFormulario = setTimeout(() => {
      this.mensajeErrorVisible.set('');
      this.submitInvalido.set(false);
      this.temporizadorErrorFormulario = null;
    }, this.duracionErrorMs());
  }

  private limpiarMensajeError(): void {
    this.limpiarTemporizadorError();
    this.mensajeErrorVisible.set('');
    this.submitInvalido.set(false);
  }

  private limpiarTemporizadorError(): void {
    if (this.temporizadorErrorFormulario === null) return;
    clearTimeout(this.temporizadorErrorFormulario);
    this.temporizadorErrorFormulario = null;
  }
}
