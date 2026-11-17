import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import {
  ActualizarPerfilPortalPayload,
  PerfilPersonalDto,
} from '../../../../core/api/interfaces/portal.interfaces';
import { formatearDni } from '../../../../helpers/dni-formato';
import { fechaApiAFechaInput } from '../../../../helpers/fecha-api';
import { formatearTelefono, limpiarTelefono } from '../../../../helpers/telefono-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-datos-personales',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-datos-personales.component.html',
  styleUrl: './formulario-datos-personales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioDatosPersonalesComponent implements OnDestroy {
  readonly perfil = input.required<PerfilPersonalDto>();
  readonly enviando = input(false);
  readonly mensajeErrorExterno = input('');
  readonly duracionErrorMs = input(5000);
  readonly enviado = output<ActualizarPerfilPortalPayload>();

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly dni = signal('');
  protected readonly email = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const perfil = this.perfil();
      untracked(() => this.sincronizarPerfil(perfil));
    });

    effect(() => {
      const mensaje = this.mensajeErrorExterno();
      if (mensaje) untracked(() => this.mostrarError(mensaje));
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(campo: 'nombre' | 'apellido', evento: Event): void {
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected actualizarTelefono(evento: Event): void {
    this.telefono.set(formatearTelefono((evento.target as HTMLInputElement).value));
  }

  protected enviar(): void {
    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();
    const fechaNacimiento = this.fechaNacimiento();

    if (!nombre || !apellido || !fechaNacimiento) {
      this.mostrarError('Completá todos los campos obligatorios.');
      return;
    }

    this.ocultarError();
    this.enviado.emit({
      nombre,
      apellido,
      fechaNacimiento,
      ...(limpiarTelefono(this.telefono()) ? { telefono: limpiarTelefono(this.telefono()) } : {}),
    });
  }

  private sincronizarPerfil(perfil: PerfilPersonalDto): void {
    this.nombre.set(perfil.nombre ?? '');
    this.apellido.set(perfil.apellido ?? '');
    this.dni.set(formatearDni(perfil.dni ?? ''));
    this.email.set(perfil.email ?? '');
    this.telefono.set(formatearTelefono(perfil.telefono ?? ''));
    this.fechaNacimiento.set(fechaApiAFechaInput(perfil.fechaNacimiento ?? undefined));
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => {
      this.errorVisible.set(false);
      this.errorTimeoutId = null;
    }, this.duracionErrorMs());
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
