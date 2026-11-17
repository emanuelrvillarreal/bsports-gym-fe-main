import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CredencialPortalDto } from '../../../../core/api/interfaces/portal.interfaces';
import { ProfesorDto } from '../../../../core/api/interfaces/usuarios-internos.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { CarnetComponent } from '../../../ui/carnet/carnet.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { CredencialProfesorComponent } from './credencial-profesor.component';

describe('CredencialProfesorComponent', () => {
  const credencial: CredencialPortalDto<ProfesorDto> = {
    userUuid: 'usuario-1',
    qr: 'qr-base64',
    profesor: {
      profesorUuid: 'profesor-1',
      nombre: 'Lionel',
      apellido: 'Messi',
      email: 'lionel@example.com',
      dni: '12345678',
      fechaAlta: '14/08/2026',
      imageUrl: 'foto.jpg',
    },
  };

  const obtenerCredencial = vi.fn();

  beforeEach(() => {
    obtenerCredencial.mockReset();
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
    TestBed.configureTestingModule({
      imports: [CredencialProfesorComponent],
      providers: [
        {
          provide: PortalProfesorApiService,
          useValue: { obtenerCredencial },
        },
        {
          provide: AuthSessionService,
          useValue: {
            companyLogoUrl: () => '',
            obtenerUrlFotoPerfilActualizada: (fotoAlternativa: string) => fotoAlternativa,
          },
        },
        {
          provide: PerformanceModeService,
          useValue: { desactivado: () => false },
        },
      ],
    });
  });

  it('delega la carga al carnet con valores seguros', () => {
    obtenerCredencial.mockReturnValue(new Subject<CredencialPortalDto<ProfesorDto>>());
    const fixture = TestBed.createComponent(CredencialProfesorComponent);

    fixture.detectChanges();

    const carnet = fixture.debugElement.query(By.directive(CarnetComponent))
      .componentInstance as CarnetComponent;
    expect(carnet.cargando()).toBe(true);
    expect(carnet.nombre()).toBe('');
    expect(carnet.campos()).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-page-loading-shell')).toBeNull();
  });

  it('muestra en el carnet la credencial cargada', () => {
    obtenerCredencial.mockReturnValue(of(credencial));
    const fixture = TestBed.createComponent(CredencialProfesorComponent);

    fixture.detectChanges();

    const carnet = fixture.debugElement.query(By.directive(CarnetComponent))
      .componentInstance as CarnetComponent;
    expect(carnet.cargando()).toBe(false);
    expect(carnet.nombre()).toBe('Lionel');
    expect(carnet.apellido()).toBe('Messi');
    expect(carnet.qrContenido()).toBe('usuario-1');
  });

  it('conserva el error y permite reintentar la carga', () => {
    obtenerCredencial
      .mockReturnValueOnce(throwError(() => new Error('fallo')))
      .mockReturnValueOnce(of(credencial));
    const fixture = TestBed.createComponent(CredencialProfesorComponent);
    const componente = fixture.componentInstance as any;

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo cargar el carnet',
    );

    componente.cargar();
    fixture.detectChanges();

    expect(obtenerCredencial).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.directive(CarnetComponent))).not.toBeNull();
  });

  it('muestra el estado vacío cuando la respuesta no contiene profesor', () => {
    obtenerCredencial.mockReturnValue(of({ userUuid: 'usuario-1', qr: 'qr-base64' }));
    const fixture = TestBed.createComponent(CredencialProfesorComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'No hay datos disponibles',
    );
    expect(fixture.debugElement.query(By.directive(CarnetComponent))).toBeNull();
  });
});
