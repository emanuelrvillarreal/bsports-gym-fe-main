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
  AltaFamiliarPortalPayload,
  Parentesco,
} from '../../../../../core/api/interfaces/socios.interfaces';
import { ActualizarPerfilPortalPayload } from '../../../../../core/api/interfaces/portal.interfaces';
import { formatearDni, limpiarDni } from '../../../../../helpers/dni-formato';
import { fechaApiAFechaInput } from '../../../../../helpers/fecha-api';
import { formatearTelefono, limpiarTelefono } from '../../../../../helpers/telefono-formato';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { InputPasswordComponent } from '../../../../ui/input-password/input-password.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

export type ModoFormularioGrupoFamiliar = 'alta' | 'edicion';

/** Datos editables que el contenedor entrega para precargar un familiar. */
export interface FamiliarGrupoVista {
  readonly nombre?: string | null;
  readonly apellido?: string | null;
  readonly email?: string | null;
  readonly parentesco?: string | null;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly fechaNacimiento?: string | null;
}

export type EnvioFormularioGrupoFamiliar =
  | { readonly modo: 'alta'; readonly datos: AltaFamiliarPortalPayload }
  | { readonly modo: 'edicion'; readonly datos: ActualizarPerfilPortalPayload };

@Component({
  selector: 'app-formulario-grupo-familiar',
  standalone: true,
  imports: [InputFechaComponent, InputPasswordComponent, SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-grupo-familiar.component.html',
  styleUrl: './formulario-grupo-familiar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioGrupoFamiliarComponent implements OnDestroy {
  readonly enviando = input(false);
  readonly duracionErrorMs = input(5000);
  readonly modo = input<ModoFormularioGrupoFamiliar>('alta');
  readonly familiar = input<FamiliarGrupoVista | null>(null);

  readonly enviado = output<EnvioFormularioGrupoFamiliar>();

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly parentesco = signal('');
  protected readonly dni = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmarPassword = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  protected readonly contrasenasCoinciden = computed(
    () => !!this.confirmarPassword() && this.password() === this.confirmarPassword(),
  );
  protected readonly esAlta = computed(() => this.modo() === 'alta');

  protected readonly opcionesParentesco: readonly SelectOption[] = [
    { value: 'CONYUGE', label: 'Cónyuge' },
    { value: 'HIJO', label: 'Hijo' },
    { value: 'HIJA', label: 'Hija' },
    { value: 'PADRE', label: 'Padre' },
    { value: 'MADRE', label: 'Madre' },
    { value: 'OTRO', label: 'Otro' },
  ];

  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const familiar = this.familiar();
      this.modo();

      this.nombre.set(familiar?.nombre ?? '');
      this.apellido.set(familiar?.apellido ?? '');
      this.parentesco.set(familiar?.parentesco ?? '');
      this.dni.set(formatearDni(familiar?.dni ?? ''));
      this.email.set(familiar?.email ?? '');
      this.password.set('');
      this.confirmarPassword.set('');
      this.telefono.set(formatearTelefono(familiar?.telefono ?? ''));
      this.fechaNacimiento.set(fechaApiAFechaInput(familiar?.fechaNacimiento ?? undefined));
      this.ocultarError();
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizar(
    campo: 'nombre' | 'apellido' | 'dni' | 'email' | 'telefono',
    evento: Event,
  ): void {
    const valor = (evento.target as HTMLInputElement).value;

    if (campo === 'nombre' || campo === 'apellido') {
      this[campo].set(this.limpiarNombre(valor));
      return;
    }

    if (campo === 'dni') {
      this.dni.set(formatearDni(valor));
      return;
    }

    if (campo === 'telefono') {
      this.telefono.set(formatearTelefono(valor));
      return;
    }

    this.email.set(valor);
  }

  protected cambiarParentesco(valor: string): void {
    this.parentesco.set(valor);
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }

    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();
    const email = this.email().trim().toLowerCase();

    if (!nombre || !apellido) {
      this.mostrarError('Nombre y apellido son obligatorios.');
      return;
    }

    if (this.esAlta() && (!email || !/^\S+@\S+\.\S+$/.test(email) || !this.parentesco())) {
      this.mostrarError('Nombre, apellido, email y parentesco son obligatorios.');
      return;
    }

    if (this.esAlta()) {
      if (!this.password() || !this.confirmarPassword()) {
        this.mostrarError('La contraseña y su confirmación son obligatorias.');
        return;
      }

      if (!this.contrasenasCoinciden()) {
        this.mostrarError('Las contraseñas no coinciden.');
        return;
      }
    }

    this.ocultarError();
    const datosPerfil = {
      nombre,
      apellido,
      ...(this.telefono().trim() ? { telefono: limpiarTelefono(this.telefono()) } : {}),
      fechaNacimiento: this.fechaNacimiento(),
    };

    if (this.esAlta()) {
      this.enviado.emit({
        modo: 'alta',
        datos: {
          nombre,
          apellido,
          email,
          parentesco: this.parentesco() as Parentesco,
          ...(this.dni().trim() ? { dni: limpiarDni(this.dni()) } : {}),
          ...(this.telefono().trim() ? { telefono: limpiarTelefono(this.telefono()) } : {}),
          ...(this.fechaNacimiento() ? { fechaNacimiento: this.fechaNacimiento() } : {}),
          password: this.password(),
        },
      });
      return;
    }

    this.enviado.emit({ modo: 'edicion', datos: datosPerfil });
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

  private limpiarNombre(valor: string): string {
    return valor.replace(/[^\p{L}\s]/gu, '').replace(/\s{2,}/g, ' ');
  }
}
