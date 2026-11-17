import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsuarioSesion } from '../../../../core/global-services/interfaces/auth-session-service.interfaces';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { AccesosClubApiService } from '../../../../core/api/services/accesos-club-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const usuarioBase: UsuarioSesion = {
    nombre: 'Ana',
    apellido: 'Pérez',
  };
  let usuario: UsuarioSesion;
  let authService: {
    obtenerUsuarioGuardado: ReturnType<typeof vi.fn>;
    obtenerRolUsuario: ReturnType<typeof vi.fn>;
    subirFotoPerfil: ReturnType<typeof vi.fn>;
    eliminarFotoPerfil: ReturnType<typeof vi.fn>;
  };
  let toast: {
    confirmDanger: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    usuario = usuarioBase;
    authService = {
      obtenerUsuarioGuardado: vi.fn(() => usuario),
      obtenerRolUsuario: vi.fn(() => 'ADMIN'),
      subirFotoPerfil: vi.fn(() => of(usuario)),
      eliminarFotoPerfil: vi.fn(() => of(usuario)),
    };
    toast = {
      confirmDanger: vi.fn(async () => true),
    };

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AccesosClubApiService, useValue: { listarPresentes: () => of({ presentes: [], count: 0 }) } },
        { provide: ToastAlertService, useValue: toast },
      ],
    });
  });

  it('abre el editor desde un botón de avatar accesible', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector(
      'button[aria-label="Cambiar foto de perfil"]',
    ) as HTMLButtonElement;

    expect(avatar).toBeInstanceOf(HTMLButtonElement);
    expect(avatar.getAttribute('aria-haspopup')).toBe('dialog');
    expect(avatar.getAttribute('aria-expanded')).toBe('false');

    avatar.click();
    fixture.detectChanges();

    expect(avatar.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-formulario-registro-foto')).not.toBeNull();
  });

  it('mantiene el popup abierto y libera la carga cuando falla la subida', () => {
    const error = new Error('La foto no pudo guardarse.');
    authService.subirFotoPerfil.mockReturnValue(throwError(() => error));
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const archivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    const componente = fixture.componentInstance as unknown as {
      abrirFotoPerfil(): void;
      guardarFotoPerfil(valor: {
        foto: File;
        fotoPreview: string;
        ancho: number;
        alto: number;
      }): void;
      fotoPopupAbierto(): boolean;
      procesandoFoto(): boolean;
      mensajeErrorFoto(): string;
    };

    componente.abrirFotoPerfil();
    componente.guardarFotoPerfil({ foto: archivo, fotoPreview: 'blob:foto', ancho: 100, alto: 100 });

    expect(authService.subirFotoPerfil).toHaveBeenCalledWith(archivo);
    expect(componente.fotoPopupAbierto()).toBe(true);
    expect(componente.procesandoFoto()).toBe(false);
    expect(componente.mensajeErrorFoto()).toBe(error.message);
  });

  it('confirma la eliminación, bloquea durante la operación y cierra al finalizar', async () => {
    usuario = { ...usuarioBase, imageUrl: '/foto.png' };
    const respuesta$ = new Subject<UsuarioSesion>();
    authService.eliminarFotoPerfil.mockReturnValue(respuesta$);
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as {
      abrirFotoPerfil(): void;
      eliminarFotoPerfil(): Promise<void>;
      fotoPopupAbierto(): boolean;
      procesandoFoto(): boolean;
    };

    componente.abrirFotoPerfil();
    await componente.eliminarFotoPerfil();

    expect(toast.confirmDanger).toHaveBeenCalledOnce();
    expect(authService.eliminarFotoPerfil).toHaveBeenCalledOnce();
    expect(componente.procesandoFoto()).toBe(true);
    expect(componente.fotoPopupAbierto()).toBe(false);

    respuesta$.next({ ...usuarioBase, imageUrl: null });
    respuesta$.complete();

    expect(componente.procesandoFoto()).toBe(false);
    expect(componente.fotoPopupAbierto()).toBe(false);
  });

  it('no elimina la foto cuando se cancela la confirmación', async () => {
    usuario = { ...usuarioBase, imageUrl: '/foto.png' };
    toast.confirmDanger.mockResolvedValue(false);
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as {
      abrirFotoPerfil(): void;
      eliminarFotoPerfil(): Promise<void>;
      fotoPopupAbierto(): boolean;
    };

    componente.abrirFotoPerfil();
    await componente.eliminarFotoPerfil();

    expect(authService.eliminarFotoPerfil).not.toHaveBeenCalled();
    expect(componente.fotoPopupAbierto()).toBe(true);
  });

  it('reabre el editor y libera la carga cuando falla la eliminacion', async () => {
    usuario = { ...usuarioBase, imageUrl: '/foto.png' };
    const error = new Error('La foto no pudo eliminarse.');
    authService.eliminarFotoPerfil.mockReturnValue(throwError(() => error));
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as {
      abrirFotoPerfil(): void;
      eliminarFotoPerfil(): Promise<void>;
      fotoPopupAbierto(): boolean;
      procesandoFoto(): boolean;
      mensajeErrorFoto(): string;
    };

    componente.abrirFotoPerfil();
    await componente.eliminarFotoPerfil();

    expect(componente.fotoPopupAbierto()).toBe(true);
    expect(componente.procesandoFoto()).toBe(false);
    expect(componente.mensajeErrorFoto()).toBe(error.message);
  });

  it('ubica eliminar junto a restablecer y deja solo cerrar en el pie', () => {
    usuario = { ...usuarioBase, imageUrl: '/foto.png' };
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector(
      'button[aria-label="Cambiar foto de perfil"]',
    ) as HTMLButtonElement;

    avatar.click();
    fixture.detectChanges();

    const accionesFormulario = fixture.nativeElement.querySelector(
      '.formulario-registro-foto__actions',
    ) as HTMLElement;
    const accionesPie = fixture.nativeElement.querySelector('.popup__acciones') as HTMLElement;

    expect(accionesFormulario.textContent).toContain('Restablecer selección');
    expect(accionesFormulario.textContent).toContain('Eliminar foto');
    expect(accionesPie.querySelectorAll('button')).toHaveLength(1);
    expect(accionesPie.textContent?.trim()).toBe('Cerrar');
    expect(accionesPie.querySelector('app-boton')?.classList).not.toContain(
      'app-boton-host--texto',
    );
  });
});
