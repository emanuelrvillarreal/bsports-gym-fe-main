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
  PerfilPortalDto,
} from '../../../../core/api/interfaces/portal.interfaces';
import { fechaApiAFechaInput } from '../../../../helpers/fecha-api';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-perfil',
  standalone: true,
  imports: [BotonComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-perfil.component.html',
  styleUrl: './formulario-perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioPerfilComponent implements OnDestroy {
  readonly perfil = input.required<PerfilPortalDto>();
  readonly enviando = input(false);
  readonly mensajeErrorExterno = input('');
  readonly duracionErrorMs = input(5000);

  readonly enviado = output<ActualizarPerfilPortalPayload>();

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly email = signal('');
  protected readonly dni = signal('');
  protected readonly numeroSocio = signal('');
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
      if (mensaje) {
        untracked(() => this.mostrarError(mensaje));
      }
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizar(
    campo: 'nombre' | 'apellido' | 'telefono' | 'fechaNacimiento',
    evento: Event,
  ): void {
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected enviar(): void {
    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();

    if (!nombre || !apellido) {
      this.mostrarError('Nombre y apellido son obligatorios.');
      return;
    }

    this.ocultarError();
    this.enviado.emit({
      nombre,
      apellido,
      fechaNacimiento: this.fechaNacimiento(),
      ...(this.telefono().trim() ? { telefono: this.telefono().trim() } : {}),
    });
  }

  private sincronizarPerfil(perfil: PerfilPortalDto): void {
    this.nombre.set(perfil.nombre);
    this.apellido.set(perfil.apellido);
    this.telefono.set(perfil.telefono ?? '');
    this.fechaNacimiento.set(fechaApiAFechaInput(perfil.fechaNacimiento ?? undefined));
    this.email.set(perfil.email ?? '');
    this.dni.set(perfil.dni ?? '');
    this.numeroSocio.set(perfil.numeroSocio ?? '');
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
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
