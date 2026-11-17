import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FormularioFiltroSolicitudesComponent } from './formulario-filtro-solicitudes.component';

describe('FormularioFiltroSolicitudesComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioFiltroSolicitudesComponent] });
    const fixture = TestBed.createComponent(FormularioFiltroSolicitudesComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('no reserva una fila vacia antes del filtro', () => {
    const form = crear().nativeElement.querySelector('form') as HTMLFormElement;
    expect(form.firstElementChild?.tagName).toBe('LABEL');
    expect(form.querySelector('[role="alert"]')).toBeNull();
  });
  it('normaliza y emite la búsqueda', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    const input = fixture.nativeElement.querySelector(
      '#filtro-solicitudes-busqueda',
    ) as HTMLInputElement;
    input.value = ' Ana ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([{ busqueda: 'Ana' }]);
  });
});
