import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { CarnetComponent } from './carnet.component';

describe('CarnetComponent', () => {
  it('renderiza el logo y los campos configurados sin conocer datos de dominio', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [CarnetComponent] });
    const fixture = TestBed.createComponent(CarnetComponent);

    fixture.componentRef.setInput('nombre', 'Ana');
    fixture.componentRef.setInput('apellido', 'Pérez');
    fixture.componentRef.setInput('logo', 'assets/club.svg');
    fixture.componentRef.setInput('campos', [
      { etiqueta: 'Legajo', valor: 'PROF-123' },
      { etiqueta: 'Disciplinas', valor: ['Tenis', 'Pádel'] },
    ]);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const logo = elemento.querySelector('.carnet__logo') as HTMLImageElement;
    const campos = Array.from(elemento.querySelectorAll('.carnet__dato-item')).map((campo) =>
      campo.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(logo.getAttribute('src')).toBe('assets/club.svg');
    expect(campos).toEqual(['Legajo PROF-123', 'Disciplinas Tenis, Pádel']);
  });
});
