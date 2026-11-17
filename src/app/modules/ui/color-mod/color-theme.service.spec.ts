import { TestBed } from '@angular/core/testing';
import { ColorThemeService, PaletaGuardada } from './color-theme.service';

describe('ColorThemeService', () => {
  const paletaEmpresaA: PaletaGuardada = {
    primario: '#111111',
    secundario: '#222222',
    terciario: '#333333',
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('aplica una paleta en las variables globales', () => {
    const servicio = TestBed.inject(ColorThemeService);
    servicio.establecerPaleta(paletaEmpresaA);

    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe('#111111');
    expect(document.body.style.getPropertyValue('--brand-secondary')).toBe('#222222');
    expect(servicio.obtenerPaletaActual()).toEqual(paletaEmpresaA);
  });

  it('aísla el caché al cambiar el contexto de empresa', () => {
    const servicio = TestBed.inject(ColorThemeService);
    servicio.establecerContextoEmpresa('empresa-a');
    servicio.establecerPaleta(paletaEmpresaA);

    servicio.establecerContextoEmpresa('empresa-b');
    const paletaEmpresaB: PaletaGuardada = {
      primario: '#444444',
      secundario: '#555555',
      terciario: '#666666',
    };
    servicio.establecerPaleta(paletaEmpresaB);

    expect(localStorage.getItem('b-spots.color-theme')).toBe(
      JSON.stringify({
        primario: paletaEmpresaB.primario,
        secundario: paletaEmpresaB.secundario,
      }),
    );
    expect(localStorage.getItem('b-spots.color-theme.empresa-a')).toBeNull();
    expect(localStorage.getItem('b-spots.color-theme.empresa-b')).toBeNull();
  });

  it('ignora paletas inválidas recibidas en tiempo de ejecución', () => {
    const servicio = TestBed.inject(ColorThemeService);
    const inicial = servicio.obtenerPaletaActual();

    servicio.establecerPaleta({ ...inicial, primario: 'azul' as `#${string}` });

    expect(servicio.obtenerPaletaActual()).toEqual(inicial);
  });

  it('conserva la ultima paleta como fallback para login', () => {
    const servicio = TestBed.inject(ColorThemeService);
    servicio.establecerContextoEmpresa('empresa-a');
    servicio.establecerPaleta(paletaEmpresaA);

    servicio.establecerContextoEmpresa(null);

    expect(localStorage.getItem('b-spots.color-theme')).toBe(
      JSON.stringify({
        primario: paletaEmpresaA.primario,
        secundario: paletaEmpresaA.secundario,
      }),
    );
    expect(servicio.obtenerPaletaActual()).toMatchObject({
      primario: paletaEmpresaA.primario,
      secundario: paletaEmpresaA.secundario,
    });
  });

  it('persiste los colores recibidos del branding público de una empresa', () => {
    const servicio = TestBed.inject(ColorThemeService);

    servicio.establecerPaletaEmpresa('#ff0000', '#0400ff');

    expect(servicio.obtenerPaletaActual()).toMatchObject({
      primario: '#ff0000',
      secundario: '#0400ff',
    });
    expect(localStorage.getItem('b-spots.color-theme')).toBe(
      JSON.stringify({ primario: '#ff0000', secundario: '#0400ff' }),
    );
  });
});
