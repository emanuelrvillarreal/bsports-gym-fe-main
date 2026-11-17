import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { LoginService } from '../../services/login.service';
import { FormularioLoginComponent } from './formulario-login.component';

const CLAVE_RECOVERY_COOLDOWN = 'auth.recovery-cooldown';
const CLAVE_LOGIN_COOLDOWN = 'auth.login-link-cooldown';

describe('FormularioLoginComponent', () => {
  const iniciarSesion = vi.fn(() => EMPTY);
  const solicitarRecuperacionPassword = vi.fn<() => Observable<void>>(() => EMPTY);
  const solicitarLoginSinContrasena = vi.fn<() => Observable<void>>(() => EMPTY);

  beforeEach(async () => {
    iniciarSesion.mockClear();
    solicitarRecuperacionPassword.mockReset();
    solicitarRecuperacionPassword.mockReturnValue(EMPTY);
    solicitarLoginSinContrasena.mockReset();
    solicitarLoginSinContrasena.mockReturnValue(EMPTY);
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [FormularioLoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: LoginService,
          useValue: {
            iniciarSesion,
            solicitarRecuperacionPassword,
            solicitarLoginSinContrasena,
          },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'light' | 'dark'>('dark') },
        },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#112233'),
            colorSecundario: signal('#445566'),
            colorTerciario: signal('#778899'),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('usa input-password y conserva el payload del login', () => {
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    (
      fixture.componentInstance as unknown as { alternarMetodoAcceso(): void }
    ).alternarMetodoAcceso();
    fixture.detectChanges();

    const usuario = fixture.nativeElement.querySelector(
      'input[formcontrolname="username"]',
    ) as HTMLInputElement;
    const password = fixture.nativeElement.querySelector(
      'app-input-password input',
    ) as HTMLInputElement;
    usuario.value = 'admin@mail.com';
    usuario.dispatchEvent(new Event('input'));
    password.value = 'secreto';
    password.dispatchEvent(new Event('input'));

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit'));

    expect(password.required).toBe(true);
    expect(password.autocomplete).toBe('current-password');
    expect(iniciarSesion).toHaveBeenCalledWith({ username: 'admin@mail.com', password: 'secreto' });
  });

  it('inicia con contraseña y conserva el email al alternar métodos', () => {
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as {
      metodoAcceso(): string;
      alternarMetodoAcceso(): void;
      emailLoginForm: { controls: { email: { setValue(valor: string): void } } };
      loginForm: { controls: { username: { value: string } } };
    };

    expect(componente.metodoAcceso()).toBe('con-contrasena');
    componente.alternarMetodoAcceso();
    fixture.detectChanges();
    expect(componente.metodoAcceso()).toBe('sin-contrasena');
    componente.emailLoginForm.controls.email.setValue('socio@club.com');
    componente.alternarMetodoAcceso();
    fixture.detectChanges();
    expect(componente.loginForm.controls.username.value).toBe('socio@club.com');
    expect(fixture.nativeElement.querySelector('input[formcontrolname="username"]')).not.toBeNull();

    componente.alternarMetodoAcceso();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="email"]')?.value).toBe(
      'socio@club.com',
    );
  });

  it('solicita enlace con el path del club y activa el cooldown solo para ese email', () => {
    const ahora = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(ahora);
    solicitarLoginSinContrasena.mockReturnValue(of(undefined as void));

    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      enviarEnlaceLogin(): void;
      loginCooldownActivo(): boolean;
      emailLoginForm: { controls: { email: { setValue(valor: string): void } } };
    };
    fixture.componentRef.setInput('companyPath', 'club-norte');
    componente.emailLoginForm.controls.email.setValue('Socio@Club.com');
    componente.enviarEnlaceLogin();
    fixture.detectChanges();

    expect(solicitarLoginSinContrasena).toHaveBeenCalledWith('Socio@Club.com', 'club-norte');
    expect(JSON.parse(localStorage.getItem(CLAVE_LOGIN_COOLDOWN) ?? '{}')).toEqual({
      'socio@club.com': ahora,
    });
    expect(componente.loginCooldownActivo()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Si el email está registrado, te enviamos un enlace para ingresar.',
    );
  });

  it('pasa al login con contraseña y oculta el switch si el método no está disponible', () => {
    solicitarLoginSinContrasena.mockReturnValue(
      throwError(() => new Error('No está disponible este metodo de login')),
    );
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    fixture.componentRef.setInput('companyPath', 'club-norte');
    const componente = fixture.componentInstance as unknown as {
      enviarEnlaceLogin(): void;
      metodoAcceso(): string;
      emailLoginForm: { controls: { email: { setValue(valor: string): void } } };
    };
    componente.emailLoginForm.controls.email.setValue('socio@club.com');
    componente.enviarEnlaceLogin();
    fixture.detectChanges();

    expect(componente.metodoAcceso()).toBe('con-contrasena');
    expect(fixture.nativeElement.querySelector('input[formcontrolname="username"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.auth-method-switch')).toBeNull();
  });

  it('activa el cooldown y muestra el mensaje del backend ante el límite 429', () => {
    solicitarLoginSinContrasena.mockReturnValue(
      throwError(
        () => new Error('Ya te enviamos un mail. Por favor, espera 5 minutos para solicitar otro.'),
      ),
    );
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      enviarEnlaceLogin(): void;
      loginCooldownActivo(): boolean;
      emailLoginForm: { controls: { email: { setValue(valor: string): void } } };
    };
    componente.emailLoginForm.controls.email.setValue('socio@club.com');
    componente.enviarEnlaceLogin();
    fixture.detectChanges();

    expect(componente.loginCooldownActivo()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Por favor, espera 5 minutos');
  });

  it('muestra Crear cuenta solo para el login de una empresa', () => {
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    (
      fixture.componentInstance as unknown as { alternarMetodoAcceso(): void }
    ).alternarMetodoAcceso();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Crear cuenta');
    expect(fixture.nativeElement.querySelector('.auth-link--inline')).not.toBeNull();

    fixture.componentRef.setInput('companyName', 'Club Norte');
    fixture.componentRef.setInput('companyUuid', '66d8cf52-68fb-4da1-8e53-83000ce8850c');
    fixture.componentRef.setInput('companyPath', 'club-norte');
    fixture.detectChanges();

    const enlace = fixture.nativeElement.querySelector('.auth-link a') as HTMLAnchorElement;
    expect(enlace.textContent).toContain('Crear cuenta');
    expect(enlace.getAttribute('href')).toBe('/club-norte/registro');
    expect(fixture.nativeElement.querySelector('.auth-link--inline')).not.toBeNull();
  });

  it('declara el secundario para enviar el codigo de recuperacion', () => {
    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as { irARecuperacion(): void };
    componente.irARecuperacion();
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      'app-boton.auth-card__submit--secondary',
    ) as HTMLElement;
    expect(boton.style.getPropertyValue('--app-boton-color-fondo')).toBe('#445566');
  });

  it('persiste el cooldown del mail enviado y permite pedir codigo con otro mail', () => {
    const ahora = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(ahora);
    solicitarRecuperacionPassword.mockReturnValue(of(undefined as void));

    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      irARecuperacion(): void;
      enviarCodigoRecuperacion(): void;
      recoveryCooldownActivo(): boolean;
      recoveryForm: { controls: { email: { setValue(valor: string): void } } };
    };
    componente.irARecuperacion();
    componente.recoveryForm.controls.email.setValue('Ana@Mail.com');
    componente.enviarCodigoRecuperacion();
    fixture.detectChanges();

    expect(JSON.parse(localStorage.getItem(CLAVE_RECOVERY_COOLDOWN) ?? '{}')).toEqual({
      'ana@mail.com': ahora,
    });
    expect(componente.recoveryCooldownActivo()).toBe(true);
    expect(botonRecoveryDeshabilitado(fixture.nativeElement)).toBe(true);

    componente.recoveryForm.controls.email.setValue('otro@mail.com');
    fixture.detectChanges();

    expect(componente.recoveryCooldownActivo()).toBe(false);
    expect(botonRecoveryDeshabilitado(fixture.nativeElement)).toBe(false);
  });

  it('envía el path de la URL al solicitar la recuperación', () => {
    solicitarRecuperacionPassword.mockReturnValue(of(undefined as void));

    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      irARecuperacion(): void;
      enviarCodigoRecuperacion(): void;
      recoveryForm: { controls: { email: { setValue(valor: string): void } } };
    };
    fixture.componentRef.setInput('companyPath', 'casla');
    componente.irARecuperacion();
    componente.recoveryForm.controls.email.setValue('socio@casla.com');
    componente.enviarCodigoRecuperacion();

    expect(solicitarRecuperacionPassword).toHaveBeenCalledWith('socio@casla.com', 'casla');
  });

  it('no envía path para el login sin segmento de club', () => {
    solicitarRecuperacionPassword.mockReturnValue(of(undefined as void));

    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      irARecuperacion(): void;
      enviarCodigoRecuperacion(): void;
      recoveryForm: { controls: { email: { setValue(valor: string): void } } };
    };
    componente.irARecuperacion();
    componente.recoveryForm.controls.email.setValue('admin@blue.com');
    componente.enviarCodigoRecuperacion();

    expect(solicitarRecuperacionPassword).toHaveBeenCalledWith('admin@blue.com', '');
  });

  it('reanuda el cooldown persistido al recargar si el mail coincide', () => {
    const ahora = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(ahora);
    localStorage.setItem(
      CLAVE_RECOVERY_COOLDOWN,
      JSON.stringify({ 'ana@mail.com': ahora - 2 * 60 * 1000 }),
    );

    const fixture = TestBed.createComponent(FormularioLoginComponent);
    const componente = fixture.componentInstance as unknown as {
      irARecuperacion(): void;
      recoveryCooldownActivo(): boolean;
      recoveryCooldownSegundos(): number;
      recoveryForm: { controls: { email: { setValue(valor: string): void } } };
    };
    componente.irARecuperacion();
    componente.recoveryForm.controls.email.setValue('ana@mail.com');
    fixture.detectChanges();

    expect(componente.recoveryCooldownActivo()).toBe(true);
    expect(componente.recoveryCooldownSegundos()).toBe(3 * 60);
    expect(botonRecoveryDeshabilitado(fixture.nativeElement)).toBe(true);
  });
});

function botonRecoveryDeshabilitado(raiz: HTMLElement): boolean {
  const boton = raiz.querySelector(
    'app-boton.auth-card__submit--secondary button',
  ) as HTMLButtonElement | null;
  return boton?.disabled ?? false;
}
