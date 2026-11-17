import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ColorThemeService } from '../color-mod/color-theme.service';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { LoadSpinnerBlueComponent } from './load-spinner-blue.component';

describe('LoadSpinnerBlueComponent', () => {
  const colorPrimario = signal('#123456');
  const colorSecundario = signal('#654321');
  const resolvedMode = signal<'light' | 'dark'>('light');

  beforeEach(async () => {
    colorPrimario.set('#123456');
    colorSecundario.set('#654321');
    resolvedMode.set('light');

    await TestBed.configureTestingModule({
      imports: [LoadSpinnerBlueComponent],
      providers: [
        {
          provide: ColorThemeService,
          useValue: { colorPrimario, colorSecundario },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode },
        },
      ],
    }).compileComponents();
  });

  it('usa los colores primario y secundario de la empresa', () => {
    const fixture = TestBed.createComponent(LoadSpinnerBlueComponent);
    fixture.detectChanges();

    const stops = fixture.nativeElement.querySelectorAll('stop') as NodeListOf<SVGStopElement>;
    expect(stops[0].getAttribute('stop-color')).toBe('#123456');
    expect(stops[1].getAttribute('stop-color')).toBe('#654321');

    colorPrimario.set('#abcdef');
    colorSecundario.set('#fedcba');
    fixture.detectChanges();
    expect(stops[0].getAttribute('stop-color')).toBe('#abcdef');
    expect(stops[1].getAttribute('stop-color')).toBe('#fedcba');
  });

  it('prioriza los colores recibidos por prop', () => {
    const fixture = TestBed.createComponent(LoadSpinnerBlueComponent);
    fixture.componentRef.setInput('colorInicio', '#111111');
    fixture.componentRef.setInput('colorFin', '#222222');
    fixture.detectChanges();

    const stops = fixture.nativeElement.querySelectorAll('stop') as NodeListOf<SVGStopElement>;
    expect(stops[0].getAttribute('stop-color')).toBe('#111111');
    expect(stops[1].getAttribute('stop-color')).toBe('#222222');
  });

  it('aclara la paleta de la empresa en dark mode para conservar contraste', () => {
    resolvedMode.set('dark');
    const fixture = TestBed.createComponent(LoadSpinnerBlueComponent);
    fixture.detectChanges();

    const stops = fixture.nativeElement.querySelectorAll('stop') as NodeListOf<SVGStopElement>;
    expect(stops[0].getAttribute('stop-color')).toBe(
      'color-mix(in srgb, #123456 72%, white)',
    );
    expect(stops[1].getAttribute('stop-color')).toBe(
      'color-mix(in srgb, #654321 72%, white)',
    );
  });

  it('usa los azules seguros si la paleta no entrega colores', () => {
    const fixture = TestBed.createComponent(LoadSpinnerBlueComponent);
    colorPrimario.set('');
    colorSecundario.set('');
    fixture.detectChanges();

    const stops = fixture.nativeElement.querySelectorAll('stop') as NodeListOf<SVGStopElement>;
    expect(stops[0].getAttribute('stop-color')).toBe('#009FE3');
    expect(stops[1].getAttribute('stop-color')).toBe('#2F52A0');
  });
});
