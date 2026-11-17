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
  ActualizarAdministradorClubPayload,
  AdministradorClubDto,
  CrearAdministradorClubPayload,
} from '../../../../../core/api/interfaces/administradores-club.interfaces';
import { formatearDni, limpiarDni } from '../../../../../helpers/dni-formato';
import { formatearTelefono } from '../../../../../helpers/telefono-formato';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { InputPasswordComponent } from '../../../../ui/input-password/input-password.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

export type ModoFormularioAdministradorClub = 'crear' | 'editar';

export type ResultadoFormularioAdministradorClub =
  | { readonly modo: 'crear'; readonly datos: CrearAdministradorClubPayload }
  | { readonly modo: 'editar'; readonly datos: ActualizarAdministradorClubPayload };

type CampoAdministrador = 'nombre' | 'apellido' | 'email' | 'dni' | 'telefono';

@Component({
  selector: 'app-formulario-administrador-club',
  standalone: true,
  imports: [InputFechaComponent, InputPasswordComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-administrador-club.component.html',
  styleUrl: './formulario-administrador-club.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioAdministradorClubComponent implements OnDestroy {
  readonly modo = input<ModoFormularioAdministradorClub>('crear');
  readonly administrador = input<AdministradorClubDto | null>(null);
  readonly duracionErrorMs = input(5000);
  readonly enviado = output<ResultadoFormularioAdministradorClub>();

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly dni = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  protected readonly esAlta = computed(() => this.modo() === 'crear');
  protected readonly emailEsValido = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim()),
  );
  protected readonly dniEsValido = computed(() => {
    const cantidad = limpiarDni(this.dni()).length;
    return cantidad >= 7 && cantidad <= 11;
  });
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => this.precargar(this.modo(), this.administrador()));
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(campo: CampoAdministrador, evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    let valor = elemento.value;
    if (campo === 'dni') {
      valor = formatearDni(valor);
      elemento.value = valor;
    } else if (campo === 'telefono') {
      valor = formatearTelefono(valor);
      elemento.value = valor;
    }
    this[campo].set(valor);
  }

  protected enviar(): void {
    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();
    const email = this.email().trim().toLowerCase();
    const dni = limpiarDni(this.dni());
    const telefono = this.telefono().trim() ? formatearTelefono(this.telefono()) : '';

    if (!nombre || !apellido) {
      this.mostrarError('El nombre y el apellido son obligatorios.');
      return;
    }

    if (this.esAlta()) {
      if (!email || !this.emailEsValido()) return this.mostrarError('Ingresá un email válido.');
      if (!this.password()) return this.mostrarError('La contraseña es obligatoria.');
      if (!this.dniEsValido()) return this.mostrarError('El DNI debe tener entre 7 y 11 dígitos.');
      this.limpiarError();
      this.enviado.emit({
        modo: 'crear',
        datos: {
          nombre,
          apellido,
          dni,
          email,
          password: this.password(),
          ...(telefono ? { telefono } : {}),
          ...(this.fechaNacimiento() ? { fechaNacimiento: this.fechaNacimiento() } : {}),
        },
      });
      return;
    }

    const inicial = this.administrador();
    const inicialTelefono = formatearTelefono(inicial?.telefono ?? '');
    if (!email || !this.emailEsValido()) return this.mostrarError('Email invÃ¡lido.');
    if (!this.dniEsValido()) return this.mostrarError('El DNI debe tener entre 7 y 11 dÃ­gitos.');
    const cambios: ActualizarAdministradorClubPayload = {
      ...(nombre !== (inicial?.nombre.trim() ?? '') ? { nombre } : {}),
      ...(apellido !== (inicial?.apellido.trim() ?? '') ? { apellido } : {}),
      ...(dni !== limpiarDni(inicial?.dni ?? '') ? { dni } : {}),
      ...(email !== (inicial?.email.trim().toLowerCase() ?? '') ? { email } : {}),
      ...(telefono !== inicialTelefono ? { telefono } : {}),
      ...(this.fechaNacimiento() !== (inicial?.fechaNacimiento ?? '')
        ? { fechaNacimiento: this.fechaNacimiento() }
        : {}),
    };
    if (!Object.keys(cambios).length) {
      this.mostrarError('No hay cambios para guardar.');
      return;
    }
    this.limpiarError();
    this.enviado.emit({ modo: 'editar', datos: cambios });
  }

  private precargar(
    modo: ModoFormularioAdministradorClub,
    administrador: AdministradorClubDto | null,
  ): void {
    this.nombre.set(modo === 'editar' ? (administrador?.nombre.trim() ?? '') : '');
    this.apellido.set(modo === 'editar' ? (administrador?.apellido.trim() ?? '') : '');
    this.email.set(modo === 'editar' ? (administrador?.email.trim().toLowerCase() ?? '') : '');
    this.password.set('');
    this.dni.set(modo === 'editar' ? formatearDni(administrador?.dni ?? '') : '');
    this.telefono.set(modo === 'editar' ? formatearTelefono(administrador?.telefono ?? '') : '');
    this.fechaNacimiento.set(modo === 'editar' ? (administrador?.fechaNacimiento ?? '') : '');
    this.limpiarError();
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
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
