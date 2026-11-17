import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { LoginFormularioPayload } from '../../interfaces/login.interface';
import { LoginService } from '../../services/login.service';
import { ToastAlertComponent } from '../../../ui/toast-alert/components/toast-alert.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputPasswordComponent } from '../../../ui/input-password/input-password.component';
import { environment } from '../../../../../environments/environment';

const CLAVE_RECOVERY_COOLDOWN = 'auth.recovery-cooldown';
const CLAVE_LOGIN_COOLDOWN = 'auth.login-link-cooldown';
const BLOQUEO_RECOVERY_SEGUNDOS = 5 * 60;
const BLOQUEO_RECOVERY_MS = BLOQUEO_RECOVERY_SEGUNDOS * 1000;

type RecoveryCooldownMapa = Record<string, number>;

@Component({
  selector: 'app-formulario-login',
  standalone: true,
  imports: [
    BotonComponent,
    InputPasswordComponent,
    ReactiveFormsModule,
    ToastAlertComponent,
    RouterLink,
    ValidacionFormularioDirective,
  ],
  templateUrl: './formulario-login.component.html',
  styleUrl: './formulario-login.component.scss',
})
export class FormularioLoginComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private temporizadorErrorValidacion: ReturnType<typeof setTimeout> | null = null;
  private temporizadorMensajeError: ReturnType<typeof setTimeout> | null = null;
  private temporizadorRecovery: ReturnType<typeof setInterval> | null = null;

  protected readonly modo = signal<'login' | 'recovery'>('login');
  protected readonly metodoAcceso = signal<'sin-contrasena' | 'con-contrasena'>('con-contrasena');
  protected readonly linkLoginDisponible = signal(true);
  readonly altoRendimiento = input(false);
  protected readonly crmRegisterUrl = environment.crmRegisterUrl;
  protected readonly enviandoLogin = signal(false);
  protected readonly enviandoCodigo = signal(false);
  protected readonly enviandoEnlace = signal(false);
  protected readonly errorLogin = signal('');
  protected readonly submitInvalido = signal(false);
  protected readonly mostrarToastConexion = signal(false);
  protected readonly intentoEnvio = signal(false);
  protected readonly intentoRecovery = signal(false);
  protected readonly mensajeErrorVisible = signal('');
  protected readonly tipoMensajeVisible = signal<'error' | 'success'>('error');
  private readonly ahoraMs = signal(Date.now());
  readonly companyName = input('');
  readonly companyUuid = input('');
  readonly companyPath = input('');
  protected readonly esLoginEmpresa = computed(
    () =>
      this.companyName().trim().length > 0 &&
      this.companyUuid().trim().length > 0 &&
      this.companyPath().trim().length > 0,
  );

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly recoveryForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly emailLoginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  private readonly emailRecovery = toSignal(this.recoveryForm.controls.email.valueChanges, {
    initialValue: this.recoveryForm.controls.email.value,
  });
  private readonly emailLogin = toSignal(this.emailLoginForm.controls.email.valueChanges, {
    initialValue: this.emailLoginForm.controls.email.value,
  });

  protected readonly recoveryCooldownSegundos = computed(() => {
    this.ahoraMs();
    return this.segundosRestantesPara(this.emailRecovery());
  });
  protected readonly recoveryCooldownActivo = computed(() => this.recoveryCooldownSegundos() > 0);
  protected readonly recoveryCooldownTexto = computed(() =>
    this.formatearCooldown(this.recoveryCooldownSegundos()),
  );
  protected readonly loginCooldownSegundos = computed(() => {
    this.ahoraMs();
    return this.segundosRestantesPara(this.emailLogin(), CLAVE_LOGIN_COOLDOWN);
  });
  protected readonly loginCooldownActivo = computed(() => this.loginCooldownSegundos() > 0);
  protected readonly loginCooldownTexto = computed(() =>
    this.formatearCooldown(this.loginCooldownSegundos()),
  );
  protected readonly emailLoginError = computed(() => {
    const control = this.emailLoginForm.controls.email;
    if (!control.touched && !control.dirty && !this.intentoEnvio()) return '';
    if (control.hasError('required')) return 'El email es obligatorio.';
    if (control.hasError('email')) return 'Ingresa un email válido.';
    return '';
  });

  protected readonly usernameError = computed(() => {
    const control = this.loginForm.controls.username;
    if (!control.touched && !control.dirty && !this.intentoEnvio()) {
      return '';
    }
    if (control.hasError('required')) {
      return 'El email es obligatorio.';
    }
    return '';
  });

  protected readonly passwordError = computed(() => {
    const control = this.loginForm.controls.password;
    if (!control.touched && !control.dirty && !this.intentoEnvio()) {
      return '';
    }
    if (control.hasError('required')) {
      return 'La contraseña es obligatoria.';
    }
    return '';
  });

  protected readonly recoveryEmailError = computed(() => {
    const control = this.recoveryForm.controls.email;
    if (!control.touched && !control.dirty && !this.intentoRecovery()) {
      return '';
    }
    if (control.hasError('required')) {
      return 'El email es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un email valido.';
    }
    return '';
  });

  constructor() {
    this.iniciarTickerRecovery();
  }

  protected alternarMetodoAcceso(): void {
    if (this.enviandoLogin() || this.enviandoEnlace() || !this.linkLoginDisponible()) return;

    if (this.metodoAcceso() === 'sin-contrasena') {
      this.loginForm.controls.username.setValue(this.emailLoginForm.controls.email.value);
      this.metodoAcceso.set('con-contrasena');
    } else {
      this.emailLoginForm.controls.email.setValue(this.loginForm.controls.username.value);
      this.metodoAcceso.set('sin-contrasena');
    }

    this.intentoEnvio.set(false);
    this.submitInvalido.set(false);
    this.limpiarMensajeError();
  }

  protected enviarEnlaceLogin(): void {
    const controlEmail = this.emailLoginForm.controls.email;
    if (this.loginCooldownActivo()) return;

    this.intentoEnvio.set(true);
    controlEmail.markAsTouched();
    controlEmail.markAsDirty();
    if (controlEmail.invalid) {
      this.mostrarMensajeErrorTemporal(this.emailLoginError() || 'Ingresa un email válido.');
      this.activarFeedbackSubmitInvalido();
      return;
    }

    this.enviandoEnlace.set(true);
    this.limpiarMensajeError();
    this.loginService
      .solicitarLoginSinContrasena(controlEmail.value, this.companyPath())
      .pipe(finalize(() => this.enviandoEnlace.set(false)))
      .subscribe({
        next: () => {
          this.registrarCooldown(controlEmail.value, CLAVE_LOGIN_COOLDOWN);
          this.mostrarMensajeExitoTemporal(
            'Si el email está registrado, te enviamos un enlace para ingresar. Revisá tu correo y la carpeta de spam.',
          );
        },
        error: (error: unknown) => {
          const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el enlace.';
          if (this.metodoLoginNoDisponible(mensaje)) {
            this.loginForm.controls.username.setValue(controlEmail.value);
            this.linkLoginDisponible.set(false);
            this.metodoAcceso.set('con-contrasena');
            this.mostrarMensajeErrorTemporal(
              'El acceso por enlace no está disponible. Podés ingresar con tu contraseña.',
            );
            return;
          }

          if (this.esErrorLimiteSolicitud(mensaje)) {
            this.registrarCooldown(controlEmail.value, CLAVE_LOGIN_COOLDOWN);
          }
          this.mostrarMensajeErrorTemporal(mensaje);
        },
      });
  }

  protected ingresar(): void {
    this.intentoEnvio.set(true);
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.mostrarMensajeErrorTemporal(
        this.usernameError() || this.passwordError() || 'Completa los campos requeridos.',
      );
      this.activarFeedbackSubmitInvalido();
      return;
    }

    const valor = this.loginForm.getRawValue() as LoginFormularioPayload;
    this.errorLogin.set('');
    this.limpiarMensajeError();
    this.enviandoLogin.set(true);

    const companyUuid = this.companyUuid().trim();
    const inicioSesion = companyUuid
      ? this.loginService.iniciarSesion(valor, companyUuid)
      : this.loginService.iniciarSesion(valor);

    inicioSesion
      .pipe(finalize(() => this.enviandoLogin.set(false)))
      .subscribe({
        next: (rutaInicio) => {
          this.intentoEnvio.set(false);
          this.limpiarMensajeError();
          void this.router.navigateByUrl(rutaInicio);
        },
        error: (error: unknown) => {
          const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
          if (this.esErrorConexion(mensaje)) {
            this.mostrarToastConexion.set(true);
            this.errorLogin.set('');
            return;
          }

          this.errorLogin.set(mensaje);
          this.mostrarMensajeErrorTemporal(mensaje);
        },
      });
  }

  private metodoLoginNoDisponible(mensaje: string): boolean {
    const normalizado = this.normalizarMensaje(mensaje);
    return normalizado.includes('no esta disponible este metodo de login');
  }

  private esErrorLimiteSolicitud(mensaje: string): boolean {
    const normalizado = this.normalizarMensaje(mensaje);
    return normalizado.includes('429') || normalizado.includes('espera 5 minutos') || normalizado.includes('ya te enviamos un mail');
  }

  private normalizarMensaje(mensaje: string): string {
    return mensaje.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  protected irARecuperacion(): void {
    this.modo.set('recovery');
    this.intentoRecovery.set(false);
    this.submitInvalido.set(false);
    this.limpiarMensajeError();
  }

  protected volverALogin(): void {
    this.modo.set('login');
    this.intentoRecovery.set(false);
    this.submitInvalido.set(false);
    this.limpiarMensajeError();
  }

  protected enviarCodigoRecuperacion(): void {
    const controlEmail = this.recoveryForm.controls.email;
    if (this.segundosRestantesPara(controlEmail.value) > 0) {
      return;
    }

    this.intentoRecovery.set(true);
    controlEmail.markAsTouched();
    controlEmail.markAsDirty();

    if (controlEmail.invalid) {
      this.mostrarMensajeErrorTemporal(this.recoveryEmailError() || 'Ingresa un email valido.');
      this.activarFeedbackSubmitInvalido();
      return;
    }

    this.enviandoCodigo.set(true);
    this.limpiarMensajeError();

    this.loginService
      .solicitarRecuperacionPassword(controlEmail.value, this.companyPath())
      .pipe(finalize(() => this.enviandoCodigo.set(false)))
      .subscribe({
        next: () => {
          this.registrarCooldownRecovery(controlEmail.value);
          this.mostrarMensajeExitoTemporal(
            'Te enviamos un enlace para continuar el cambio de contraseña.',
          );
        },
        error: (error: unknown) => {
          const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el codigo.';
          this.mostrarMensajeErrorTemporal(mensaje);
        },
      });
  }

  protected cerrarToastConexion(): void {
    this.mostrarToastConexion.set(false);
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadorRecovery();
    this.limpiarTemporizadorMensajeError();
    if (this.temporizadorErrorValidacion) {
      clearTimeout(this.temporizadorErrorValidacion);
      this.temporizadorErrorValidacion = null;
    }
  }

  private activarFeedbackSubmitInvalido(): void {
    if (this.temporizadorErrorValidacion) {
      clearTimeout(this.temporizadorErrorValidacion);
    }

    this.submitInvalido.set(false);
    queueMicrotask(() => this.submitInvalido.set(true));
    this.temporizadorErrorValidacion = setTimeout(() => {
      this.submitInvalido.set(false);
      this.temporizadorErrorValidacion = null;
    }, 5000);
  }

  private esErrorConexion(mensaje: string): boolean {
    const valor = mensaje.trim().toLowerCase();
    return (
      valor.includes('failed to fetch') ||
      valor.includes('http failure response') ||
      valor.includes('unknown error')
    );
  }

  private mostrarMensajeErrorTemporal(mensaje: string): void {
    this.limpiarTemporizadorMensajeError();
    this.tipoMensajeVisible.set('error');
    this.mensajeErrorVisible.set(mensaje.trim());
    this.temporizadorMensajeError = setTimeout(() => {
      this.mensajeErrorVisible.set('');
      this.temporizadorMensajeError = null;
    }, 5000);
  }

  private mostrarMensajeExitoTemporal(mensaje: string): void {
    this.limpiarTemporizadorMensajeError();
    this.tipoMensajeVisible.set('success');
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
    if (this.temporizadorMensajeError) {
      clearTimeout(this.temporizadorMensajeError);
      this.temporizadorMensajeError = null;
    }
  }

  private registrarCooldownRecovery(email: string): void {
    this.registrarCooldown(email, CLAVE_RECOVERY_COOLDOWN);
  }

  private registrarCooldown(email: string, clave: string): void {
    const emailNormalizado = this.normalizarEmail(email);
    if (!emailNormalizado) {
      return;
    }

    const mapa = this.purgarVencidos(this.leerMapaCooldown(clave));
    mapa[emailNormalizado] = Date.now();
    this.guardarMapaCooldown(mapa, clave);
    this.ahoraMs.update((ahora) => Math.max(Date.now(), ahora + 1));
    this.iniciarTickerRecovery();
  }

  private iniciarTickerRecovery(): void {
    if (!this.esNavegador || this.temporizadorRecovery) {
      return;
    }

    this.purgarYPersistirCooldown(CLAVE_RECOVERY_COOLDOWN);
    this.purgarYPersistirCooldown(CLAVE_LOGIN_COOLDOWN);
    this.ahoraMs.set(Date.now());
    this.temporizadorRecovery = setInterval(() => {
      this.purgarYPersistirCooldown(CLAVE_RECOVERY_COOLDOWN);
      this.purgarYPersistirCooldown(CLAVE_LOGIN_COOLDOWN);
      this.ahoraMs.set(Date.now());
    }, 1000);
  }

  private segundosRestantesPara(email: string, clave = CLAVE_RECOVERY_COOLDOWN): number {
    const disparadoEnMs = this.leerMapaCooldown(clave)[this.normalizarEmail(email)];
    if (!disparadoEnMs) {
      return 0;
    }

    const restanteMs = disparadoEnMs + BLOQUEO_RECOVERY_MS - Date.now();
    return Math.max(0, Math.ceil(restanteMs / 1000));
  }

  private purgarYPersistirCooldown(clave: string): void {
    const mapa = this.leerMapaCooldown(clave);
    const vigente = this.purgarVencidos(mapa);
    if (Object.keys(vigente).length !== Object.keys(mapa).length) {
      this.guardarMapaCooldown(vigente, clave);
    }
  }

  private purgarVencidos(mapa: RecoveryCooldownMapa): RecoveryCooldownMapa {
    const ahora = Date.now();
    const vigente: RecoveryCooldownMapa = {};
    for (const [email, disparadoEnMs] of Object.entries(mapa)) {
      if (ahora - disparadoEnMs < BLOQUEO_RECOVERY_MS) {
        vigente[email] = disparadoEnMs;
      }
    }

    return vigente;
  }

  private leerMapaCooldown(clave: string): RecoveryCooldownMapa {
    if (!this.esNavegador) {
      return {};
    }

    try {
      const serializado = localStorage.getItem(clave);
      if (!serializado) {
        return {};
      }

      const parseado: unknown = JSON.parse(serializado);
      if (!parseado || typeof parseado !== 'object' || Array.isArray(parseado)) {
        return {};
      }

      const mapa: RecoveryCooldownMapa = {};
      for (const [email, disparadoEnMs] of Object.entries(parseado as Record<string, unknown>)) {
        if (typeof disparadoEnMs === 'number' && Number.isFinite(disparadoEnMs) && disparadoEnMs > 0) {
          mapa[email] = disparadoEnMs;
        }
      }

      return mapa;
    } catch {
      return {};
    }
  }

  private guardarMapaCooldown(mapa: RecoveryCooldownMapa, clave: string): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      if (Object.keys(mapa).length === 0) {
        localStorage.removeItem(clave);
        return;
      }

      localStorage.setItem(clave, JSON.stringify(mapa));
    } catch {
      return;
    }
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private limpiarTemporizadorRecovery(): void {
    if (!this.temporizadorRecovery) {
      return;
    }

    clearInterval(this.temporizadorRecovery);
    this.temporizadorRecovery = null;
  }

  private formatearCooldown(totalSegundos: number): string {
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }
}
