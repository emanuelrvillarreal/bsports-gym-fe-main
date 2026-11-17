import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FormularioFiltroSociosComponent } from './formulario-filtro-socios.component';

describe('FormularioFiltroSociosComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioFiltroSociosComponent] });
    const fixture = TestBed.createComponent(FormularioFiltroSociosComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('normaliza la búsqueda y emite los filtros', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    const input = fixture.nativeElement.querySelector('#socios-busqueda') as HTMLInputElement;
    input.value = ' Pérez ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([{ busqueda: 'Pérez', estados: [] }]);
  });
  it('emite inmediatamente el estado seleccionado', () => {
    const fixture = crear();
    const payloads: Array<{ estados: readonly string[] }> = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(payloads.at(-1)?.estados).toEqual(['ACTIVO']);
  });
});
