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
  ActualizarUsuarioInternoPayload,
  CrearUsuarioInternoPayload,
  UsuarioInternoBaseDto,
} from '../../../../../core/api/interfaces/usuarios-internos.interfaces';
import { formatearDni, limpiarDni } from '../../../../../helpers/dni-formato';
import { formatearTelefono } from '../../../../../helpers/telefono-formato';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { InputPasswordComponent } from '../../../../ui/input-password/input-password.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

type CampoUsuarioInterno =
  | 'nombre'
  | 'apellido'
  | 'email'
  | 'password'
  | 'dni'
  | 'telefono'
  | 'fechaNacimiento'
  | 'fechaAlta';

export type ModoFormularioUsuarioInterno = 'crear' | 'editar';

export type ResultadoFormularioUsuarioInterno =
  | { readonly modo: 'crear'; readonly datos: CrearUsuarioInternoPayload }
  | { readonly modo: 'editar'; readonly datos: ActualizarUsuarioInternoPayload };

@Component({
  selector: 'app-formulario-usuario-interno',
  standalone: true,
  imports: [InputFechaComponent, InputPasswordComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-usuario-interno.component.html',
  styleUrl: './formulario-usuario-interno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioUsuarioInternoComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly mostrarFechaAlta = input(true);
  readonly modo = input<ModoFormularioUsuarioInterno>('crear');
  readonly usuarioInicial = input<UsuarioInternoBaseDto | null>(null);
  readonly enviado = output<ResultadoFormularioUsuarioInterno>();

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly dni = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly fechaAlta = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  protected readonly dniEsValido = computed(() => {
    const cantidadDigitos = limpiarDni(this.dni()).length;
    return cantidadDigitos >= 7 && cantidadDigitos <= 11;
  });
  protected readonly emailEsValido = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim()),
  );
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => this.precargarUsuario(this.modo(), this.usuarioInicial()));
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(campo: CampoUsuarioInterno, evento: Event): void {
    const input = evento.target as HTMLInputElement;

    if (campo === 'nombre' || campo === 'apellido') {
      const soloLetras = input.value.replace(/[^\p{L}\s]/gu, '');
      this[campo].set(soloLetras);
      input.value = soloLetras;
      return;
    }

    if (campo === 'dni') {
      const dniFormateado = formatearDni(input.value);
      this.dni.set(dniFormateado);
      input.value = dniFormateado;
      return;
    }

    if (campo === 'telefono') {
      const telefonoFormateado = formatearTelefono(input.value);
      this.telefono.set(telefonoFormateado);
      input.value = telefonoFormateado;
      return;
    }

    this[campo].set(input.value);
  }

  protected enviar(): void {
    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();
    const email = this.email().trim().toLowerCase();
    const password = this.password();
    const dni = limpiarDni(this.dni());
    if (!nombre || !apellido || !email || (this.modo() === 'crear' && !password)) {
      this.mostrarError(
        this.modo() === 'crear'
          ? 'Nombre, apellido, email y contraseña son obligatorios.'
          : 'Nombre, apellido, email y DNI son obligatorios.',
      );
      return;
    }
    if (!this.emailEsValido()) {
      this.mostrarError('Ingresá un email válido.');
      return;
    }
    if (dni.length < 7 || dni.length > 11) {
      this.mostrarError('El DNI debe tener entre 7 y 11 dígitos.');
      return;
    }

    this.limpiarTimeoutError();
    this.errorVisible.set(false);
    const telefono = this.telefono().trim() ? formatearTelefono(this.telefono()) : '';

    if (this.modo() === 'editar') {
      const datos = this.crearCambiosEdicion({ nombre, apellido, email, dni, telefono });
      if (!Object.keys(datos).length) {
        this.mostrarError('No hay cambios para guardar.');
        return;
      }
      this.enviado.emit({ modo: 'editar', datos });
      return;
    }

    this.enviado.emit({
      modo: 'crear',
      datos: {
        nombre,
        apellido,
        email,
        password,
        dni,
        ...(telefono ? { telefono } : {}),
        ...(this.fechaNacimiento() ? { fechaNacimiento: this.fechaNacimiento() } : {}),
        ...(this.mostrarFechaAlta() && this.fechaAlta() ? { fechaAlta: this.fechaAlta() } : {}),
      },
    });
  }

  private precargarUsuario(
    modo: ModoFormularioUsuarioInterno,
    usuario: UsuarioInternoBaseDto | null,
  ): void {
    if (modo !== 'editar' || !usuario) return;

    this.nombre.set(usuario.nombre.trim());
    this.apellido.set(usuario.apellido.trim());
    this.email.set(usuario.email.trim().toLowerCase());
    this.dni.set(formatearDni(usuario.dni ?? ''));
    this.telefono.set(formatearTelefono(usuario.telefono ?? ''));
    this.password.set('');
    this.fechaNacimiento.set('');
    this.fechaAlta.set('');
  }

  private crearCambiosEdicion(valores: {
    readonly nombre: string;
    readonly apellido: string;
    readonly email: string;
    readonly dni: string;
    readonly telefono: string;
  }): ActualizarUsuarioInternoPayload {
    const inicial = this.usuarioInicial();
    if (!inicial) return valores;

    const cambios: Record<string, string> = {};
    if (valores.nombre !== inicial.nombre.trim()) cambios['nombre'] = valores.nombre;
    if (valores.apellido !== inicial.apellido.trim()) cambios['apellido'] = valores.apellido;
    if (valores.email !== inicial.email.trim().toLowerCase()) cambios['email'] = valores.email;
    if (valores.dni !== limpiarDni(inicial.dni ?? '')) cambios['dni'] = valores.dni;
    if (valores.telefono !== formatearTelefono(inicial.telefono ?? '')) {
      cambios['telefono'] = valores.telefono;
    }
    return cambios;
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
