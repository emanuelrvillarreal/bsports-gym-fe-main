import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { formatearCuil, limpiarCuil } from '../../../../helpers/cuil-formato';
import { normalizarPathEmpresa } from '../../../../helpers/normalizar-path-empresa';
import { formatearTelefono, limpiarTelefono } from '../../../../helpers/telefono-formato';
import {
  OPCIONES_PERIODICIDAD_CUOTA,
  PERIODICIDAD_CUOTA_PREDETERMINADA,
  type PeriodicidadCuota,
} from '../../../../core/api/interfaces/periodicidad-cuota.interfaces';
import {
  DomicilioClubPayload,
  RegistroEmpresaPayload,
} from '../../interfaces/registro-empresa.interface';
import {
  CondicionImpositivaCrmDto,
  ProvinciaCrmDto,
} from '../../../../core/api/interfaces/crm.interfaces';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputPasswordComponent } from '../../../ui/input-password/input-password.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

const PATRON_CUIT = /^\d{11}$/;
const PATRON_TELEFONO = /^\d{8,15}$/;
const PATRON_COLOR_HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-formulario-registro-empresa',
  standalone: true,
  imports: [
    BotonComponent,
    InputPasswordComponent,
    ReactiveFormsModule,
    SelectComponent,
    ValidacionFormularioDirective,
  ],
  templateUrl: './formulario-registro-empresa.component.html',
  styleUrl: './formulario-registro-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioRegistroEmpresaComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private temporizadorErrorValidacion: ReturnType<typeof setTimeout> | null = null;
  private temporizadorMensajeError: ReturnType<typeof setTimeout> | null = null;

  readonly textoBoton = input('Registrar gimnasio');
  readonly cargando = input(false);
  readonly mostrarAcciones = input(true);
  readonly provinciasCrm = input<readonly ProvinciaCrmDto[]>([]);
  readonly condicionesImpositivasCrm = input<readonly CondicionImpositivaCrmDto[]>([]);
  readonly submitted = output<RegistroEmpresaPayload>();

  protected readonly opcionesProvinciasCrm = computed<readonly SelectOption[]>(() =>
    this.provinciasCrm().map((provincia) => ({
      value: provincia.codigo,
      label: `${provincia.nombre} (${provincia.pais})`,
    })),
  );
  protected readonly opcionesCondicionesImpositivasCrm = computed<readonly SelectOption[]>(() =>
    this.condicionesImpositivasCrm().map((condicion) => ({
      value: condicion.codigo,
      label: condicion.nombre,
    })),
  );
  protected readonly opcionesPeriodicidadCuota: readonly SelectOption[] =
    OPCIONES_PERIODICIDAD_CUOTA.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta }));

  protected readonly intentoEnvio = signal(false);
  protected readonly submitInvalido = signal(false);
  protected readonly mensajeErrorVisible = signal('');
  protected readonly domicilios = [
    {
      grupo: 'domicilio',
      titulo: 'Domicilio principal',
      descripcion: 'Direccion legal o institucional del gimnasio.',
    },
    {
      grupo: 'domicilioFacturacion',
      titulo: 'Domicilio de facturacion',
      descripcion: 'Direccion utilizada para la emision de facturas.',
    },
  ] as const;

  protected readonly registroForm = this.formBuilder.group({
    nombreComercial: this.formBuilder.nonNullable.control('', Validators.required),
    razonSocial: this.formBuilder.nonNullable.control('', Validators.required),
    cuit: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(PATRON_CUIT),
    ]),
    domicilio: this.crearGrupoDomicilio(),
    domicilioFacturacion: this.crearGrupoDomicilio(),
    telefono: this.crearControlTelefono(),
    emailFacturaElectronica: this.crearControlEmail(),
    emailInstitucional: this.crearControlEmail(),
    colorPrimario: this.formBuilder.nonNullable.control('#003366', [
      Validators.required,
      Validators.pattern(PATRON_COLOR_HEX),
    ]),
    colorSecundario: this.formBuilder.nonNullable.control('#FFCC00', [
      Validators.required,
      Validators.pattern(PATRON_COLOR_HEX),
    ]),
    cuotaSocialHabilitada: this.formBuilder.nonNullable.control(false),
    codigoCondicionImpositiva: this.formBuilder.nonNullable.control('', Validators.required),
    codigoProvincia: this.formBuilder.nonNullable.control('', Validators.required),
    periodicidadCuotaSocial: this.formBuilder.nonNullable.control<PeriodicidadCuota>(
      PERIODICIDAD_CUOTA_PREDETERMINADA,
      Validators.required,
    ),
    diasVencimientoMoroso: this.formBuilder.control<number | null>(null, Validators.min(0)),
    diasInhabilitacion: this.formBuilder.control<number | null>(null, Validators.min(0)),
    admin: this.formBuilder.group(
      {
        nombre: this.formBuilder.nonNullable.control('', Validators.required),
        apellido: this.formBuilder.nonNullable.control('', Validators.required),
        email: this.crearControlEmail(),
        password: this.formBuilder.nonNullable.control('', [Validators.required]),
        confirmarPassword: this.formBuilder.nonNullable.control('', Validators.required),
      },
      { validators: this.validarCoincidenciaContrasenas() },
    ),
  });

  ngOnDestroy(): void {
    if (this.temporizadorErrorValidacion) clearTimeout(this.temporizadorErrorValidacion);
    this.limpiarTemporizadorMensajeError();
  }

  resetearFormulario(): void {
    this.registroForm.reset({
      colorPrimario: '#003366',
      colorSecundario: '#FFCC00',
      cuotaSocialHabilitada: false,
      codigoCondicionImpositiva: '',
      codigoProvincia: '',
      periodicidadCuotaSocial: PERIODICIDAD_CUOTA_PREDETERMINADA,
      diasVencimientoMoroso: null,
      diasInhabilitacion: null,
    });
    this.registroForm.markAsPristine();
    this.registroForm.markAsUntouched();
    this.intentoEnvio.set(false);
    this.limpiarMensajeError();
  }

  obtenerPayloadValido(): RegistroEmpresaPayload | null {
    this.intentoEnvio.set(true);
    this.registroForm.markAllAsTouched();
    this.registroForm.updateValueAndValidity();

    if (this.registroForm.invalid) {
      this.mostrarMensajeErrorTemporal(this.obtenerMensajeErrorFormulario());
      this.activarFeedbackSubmitInvalido();
      return null;
    }

    const valor = this.registroForm.getRawValue();
    const payload: RegistroEmpresaPayload = {
      path: normalizarPathEmpresa(valor.nombreComercial),
      nombreComercial: valor.nombreComercial.trim(),
      razonSocial: valor.razonSocial.trim(),
      cuit: limpiarCuil(valor.cuit),
      domicilio: this.normalizarDomicilio(valor.domicilio),
      domicilioFacturacion: this.normalizarDomicilio(valor.domicilioFacturacion),
      telefono: limpiarTelefono(valor.telefono),
      emailFacturaElectronica: valor.emailFacturaElectronica.trim().toLowerCase(),
      emailInstitucional: valor.emailInstitucional.trim().toLowerCase(),
      colorPrimario: valor.colorPrimario,
      colorSecundario: valor.colorSecundario,
      cuotaSocialHabilitada: valor.cuotaSocialHabilitada,
      codigoCondicionImpositiva: valor.codigoCondicionImpositiva,
      codigoProvincia: valor.codigoProvincia,
      periodicidadCuotaSocial: valor.periodicidadCuotaSocial,
      ...(valor.diasVencimientoMoroso !== null
        ? { diasVencimientoMoroso: valor.diasVencimientoMoroso }
        : {}),
      ...(valor.diasInhabilitacion !== null
        ? { diasInhabilitacion: valor.diasInhabilitacion }
        : {}),
      admin: {
        nombre: valor.admin.nombre.trim(),
        apellido: valor.admin.apellido.trim(),
        email: valor.admin.email.trim().toLowerCase(),
        password: valor.admin.password,
      },
    };

    this.limpiarMensajeError();
    return payload;
  }

  protected registrarEmpresa(): void {
    const payload = this.obtenerPayloadValido();
    if (payload) this.submitted.emit(payload);
  }

  protected campoInvalido(ruta: string): boolean {
    const control = this.registroForm.get(ruta);
    return !!control?.invalid && (control.touched || control.dirty || this.intentoEnvio());
  }

  protected obtenerErrorCampo(ruta: string): string {
    const control = this.registroForm.get(ruta);
    if (
      !control ||
      !control.invalid ||
      (!control.touched && !control.dirty && !this.intentoEnvio())
    )
      return '';
    if (control.hasError('required')) return 'Obligatorio.';
    if (control.hasError('email')) return 'Email invalido.';
    if (control.hasError('pattern')) {
      if (ruta === 'cuit') return 'Debe tener 11 numeros.';
      if (ruta.includes('telefono')) return 'Debe tener entre 8 y 15 numeros.';
      if (ruta.includes('color')) return 'Usa un color hexadecimal valido.';
      return 'Formato invalido.';
    }
    if (control.hasError('min')) return 'El valor debe ser mayor al minimo permitido.';
    return '';
  }

  protected confirmacionContrasenaInvalida(): boolean {
    const confirmarPassword = this.registroForm.controls.admin.controls.confirmarPassword;
    const admin = this.registroForm.controls.admin;
    return (
      (confirmarPassword.touched || confirmarPassword.dirty || this.intentoEnvio()) &&
      (confirmarPassword.invalid || admin.hasError('contrasenasNoCoinciden'))
    );
  }

  protected obtenerErrorConfirmacionContrasena(): string {
    const confirmarPassword = this.registroForm.controls.admin.controls.confirmarPassword;
    if (!this.confirmacionContrasenaInvalida()) return '';
    if (confirmarPassword.hasError('required')) return 'Obligatorio.';
    if (this.registroForm.controls.admin.hasError('contrasenasNoCoinciden')) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  }

  protected valorFormateadoCuit(): string {
    return formatearCuil(this.registroForm.controls.cuit.value);
  }

  protected filtrarCuit(evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    if (!input) return;
    const valor = limpiarCuil(input.value);
    input.value = formatearCuil(valor);
    this.registroForm.controls.cuit.setValue(valor);
  }

  protected valorFormateadoTelefono(campo: 'telefono'): string {
    return formatearTelefono(this.registroForm.controls[campo].value);
  }

  protected filtrarTelefono(evento: Event, campo: 'telefono'): void {
    const input = evento.target as HTMLInputElement | null;
    if (!input) return;

    const valor = limpiarTelefono(input.value);
    input.value = formatearTelefono(valor);
    this.registroForm.controls[campo].setValue(valor);
  }

  private crearGrupoDomicilio() {
    return this.formBuilder.group({
      direccion: this.formBuilder.nonNullable.control('', Validators.required),
      codigoPostal: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(6),
      ]),
      localidad: this.formBuilder.nonNullable.control('', Validators.required),
    });
  }

  private crearControlEmail() {
    return this.formBuilder.nonNullable.control('', [Validators.required, Validators.email]);
  }

  private crearControlTelefono() {
    return this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(PATRON_TELEFONO),
    ]);
  }

  private normalizarDomicilio(domicilio: DomicilioClubPayload): DomicilioClubPayload {
    return {
      direccion: domicilio.direccion.trim(),
      codigoPostal: domicilio.codigoPostal.trim(),
      localidad: domicilio.localidad.trim(),
    };
  }

  private validarCoincidenciaContrasenas(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value;
      const confirmarPassword = control.get('confirmarPassword')?.value;
      if (!password || !confirmarPassword) return null;
      return password === confirmarPassword ? null : { contrasenasNoCoinciden: true };
    };
  }

  private activarFeedbackSubmitInvalido(): void {
    if (this.temporizadorErrorValidacion) clearTimeout(this.temporizadorErrorValidacion);
    this.submitInvalido.set(false);
    queueMicrotask(() => this.submitInvalido.set(true));
    this.temporizadorErrorValidacion = setTimeout(() => {
      this.submitInvalido.set(false);
      this.temporizadorErrorValidacion = null;
    }, 5000);
  }

  private obtenerMensajeErrorFormulario(): string {
    if (this.registroForm.hasError('importeCuotaRequerido')) {
      return 'Ingresa el importe de la cuota social.';
    }
    return 'Completa todos los campos obligatorios con datos validos.';
  }

  private mostrarMensajeErrorTemporal(mensaje: string): void {
    this.limpiarTemporizadorMensajeError();
    this.mensajeErrorVisible.set(mensaje.trim());
    this.temporizadorMensajeError = setTimeout(() => {
      this.mensajeErrorVisible.set('');
      this.temporizadorMensajeError = null;
    }, 5000);
  }

  private limpiarMensajeError(): void {
    this.limpiarTemporizadorMensajeError();
    this.mensajeErrorVisible.set('');
  }

  private limpiarTemporizadorMensajeError(): void {
    if (!this.temporizadorMensajeError) return;
    clearTimeout(this.temporizadorMensajeError);
    this.temporizadorMensajeError = null;
  }
}
