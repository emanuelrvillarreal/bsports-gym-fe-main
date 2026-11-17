import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { ColorModComponent } from './color-mod.component';
import { ColorThemeService, PaletaGuardada } from './color-theme.service';

describe('ColorModComponent', () => {
  const persistida: PaletaGuardada = {
    primario: '#123456',
    secundario: '#234567',
    terciario: '#345678',
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ColorModComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'dark' | 'light'>('light') },
        },
      ],
    }).compileComponents();
  });

  it('hidrata y previsualiza la paleta persistida', () => {
    const fixture = TestBed.createComponent(ColorModComponent);
    fixture.componentRef.setInput('paletaPersistida', persistida);
    fixture.detectChanges();

    expect(TestBed.inject(ColorThemeService).obtenerPaletaActual()).toEqual(persistida);
    expect(document.documentElement.style.getPropertyValue('--color-primario')).toBe('#123456');
    expect(fixture.nativeElement.textContent).not.toContain('Terciario');
  });

  it('emite el guardado sin realizar persistencia propia', () => {
    const fixture = TestBed.createComponent(ColorModComponent);
    const emitidas: PaletaGuardada[] = [];
    fixture.componentRef.setInput('paletaPersistida', persistida);
    fixture.componentInstance.guardarSolicitado.subscribe((paleta) => emitidas.push(paleta));
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('input[type="color"]') as HTMLInputElement;
    selector.value = '#abcdef';
    selector.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const guardar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.includes('Guardar colores')) as HTMLButtonElement;
    guardar.click();

    expect(emitidas).toEqual([{ ...persistida, primario: '#abcdef' }]);
  });

  it('confirma, aplica y emite la paleta predeterminada al restablecer', () => {
    const fixture = TestBed.createComponent(ColorModComponent);
    const emitidas: PaletaGuardada[] = [];
    fixture.componentRef.setInput('paletaPersistida', persistida);
    fixture.componentInstance.restablecerSolicitado.subscribe((paleta) => emitidas.push(paleta));
    fixture.detectChanges();

    const botones = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    botones()
      .find((boton) => boton.textContent?.trim() === 'Restablecer')
      ?.click();
    fixture.detectChanges();
    botones()
      .filter((boton) => boton.textContent?.trim() === 'Restablecer')
      .at(-1)
      ?.click();

    const predeterminada = TestBed.inject(ColorThemeService).obtenerPaletaPredeterminada();
    expect(emitidas).toEqual([predeterminada]);
    expect(TestBed.inject(ColorThemeService).obtenerPaletaActual()).toEqual(predeterminada);
  });
});
