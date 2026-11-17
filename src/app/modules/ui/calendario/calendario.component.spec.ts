import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { ColorThemeService } from '../color-mod/color-theme.service';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { CalendarioComponent } from './calendario.component';

describe('CalendarioComponent', () => {
  it('muestra el spinner reutilizable y oculta la grilla durante la carga', () => {
    TestBed.configureTestingModule({
      imports: [CalendarioComponent],
      providers: [
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#009fe3'),
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'dark' | 'light'>('light') },
        },
      ],
    });
    const fixture = TestBed.createComponent(CalendarioComponent);
    fixture.componentRef.setInput('mesActivo', '2026-08');
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.directive(LoadSpinnerBlueComponent))
      .componentInstance as LoadSpinnerBlueComponent;

    expect(spinner.ariaLabel()).toBe('Cargando calendario');
    expect(fixture.nativeElement.querySelector('.calendario__grid')).toBeNull();
  });
});
