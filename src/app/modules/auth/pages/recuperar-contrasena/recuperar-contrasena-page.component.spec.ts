import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { LoginService } from '../../services/login.service';
import { RecuperarContrasenaPageComponent } from './recuperar-contrasena-page.component';

describe('RecuperarContrasenaPageComponent', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  async function crearPagina(query: Record<string, string> = {}) {
    const queryParamMap = convertToParamMap(query);

    await TestBed.configureTestingModule({
      imports: [RecuperarContrasenaPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(queryParamMap),
            snapshot: { queryParamMap },
          },
        },
        {
          provide: LoginService,
          useValue: { cambiarContrasenaConToken: vi.fn(() => EMPTY) },
        },
        {
          provide: AuthSessionService,
          useValue: {
            companyLogoUrl: signal('https://cdn.example/escudo.png'),
            companyName: signal('Club Demo'),
          },
        },
        {
          provide: ThemeModeService,
          useValue: {
            resolvedMode: signal<'light' | 'dark'>('dark'),
            inicializar: vi.fn(),
          },
        },
        {
          provide: ColorThemeService,
          useValue: {
            inicializar: vi.fn(),
            colorPrimario: signal('#112233'),
            colorSecundario: signal('#445566'),
            colorTerciario: signal('#778899'),
          },
        },
        {
          provide: PerformanceModeService,
          useValue: { desactivado: signal(true) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RecuperarContrasenaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('usa el logo de empresa persistido como en login', async () => {
    const fixture = await crearPagina({ code: 'abc', email: 'ana@mail.com' });
    const imagen = fixture.nativeElement.querySelector(
      '.auth-page__brand img',
    ) as HTMLImageElement;

    expect(imagen.getAttribute('ng-src') ?? imagen.getAttribute('src')).toContain(
      'https://cdn.example/escudo.png',
    );
    expect(fixture.nativeElement.querySelector('.auth-page__brand-text').textContent).toContain(
      'Club Demo',
    );
    expect(fixture.nativeElement.querySelector('.auth-page__visual')).not.toBeNull();
  });

  it('habilita el restablecimiento cuando el enlace trae email y code', async () => {
    const fixture = await crearPagina({
      code: 'Q9D4JIT084JD4HQNP5V4UYUC8HC61NZ1',
      email: 'ana@mail.com',
    });
    const componente = fixture.componentInstance as unknown as {
      linkValido(): boolean;
      code(): string;
      email(): string;
      mensajeError(): string;
    };

    expect(componente.linkValido()).toBe(true);
    expect(componente.code()).toBe('Q9D4JIT084JD4HQNP5V4UYUC8HC61NZ1');
    expect(componente.email()).toBe('ana@mail.com');
    expect(componente.mensajeError()).toBe('');
  });

  it('acepta Token como code y bloquea si el enlace no trae datos', async () => {
    const conCode = await crearPagina({ Token: 'uuid-token', email: 'ana@mail.com' });
    const paginaConCode = conCode.componentInstance as unknown as {
      linkValido(): boolean;
      code(): string;
    };
    expect(paginaConCode.linkValido()).toBe(true);
    expect(paginaConCode.code()).toBe('uuid-token');

    TestBed.resetTestingModule();
    const sinToken = await crearPagina();
    const paginaSinToken = sinToken.componentInstance as unknown as {
      linkValido(): boolean;
      mensajeError(): string;
    };
    expect(paginaSinToken.linkValido()).toBe(false);
    expect(paginaSinToken.mensajeError()).toBe(
      'El enlace de recuperacion no contiene los datos necesarios.',
    );
  });
});
