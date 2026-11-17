import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormularioAmenityComponent } from './formulario-amenity.component';

describe('FormularioAmenityComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioAmenityComponent] });
    const fixture = TestBed.createComponent(FormularioAmenityComponent);
    fixture.detectChanges();
    return fixture;
  }

  function completar(fixture: ReturnType<typeof crear>, id: string, valor: string): void {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function seleccionarPrimerDia(fixture: ReturnType<typeof crear>): void {
    const dia = fixture.nativeElement.querySelector(
      'fieldset input[type="checkbox"]',
    ) as HTMLInputElement;
    dia.checked = true;
    dia.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  it('emite un amenity pago normalizado y formatea el importe al salir del campo', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completar(fixture, 'amenity-nombre', ' Cancha 1 ');
    completar(fixture, 'amenity-monto-hora', '$ 1.500,50');
    completar(fixture, 'amenity-porcentaje-sena', '25');
    completar(fixture, 'amenity-hora-inicio', '10:00');
    completar(fixture, 'amenity-hora-fin', '11:00');
    seleccionarPrimerDia(fixture);
    const monto = fixture.nativeElement.querySelector('#amenity-monto-hora') as HTMLInputElement;
    monto.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(monto.value).toBe('$1.500,50');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        nombre: 'Cancha 1',
        montoHora: 1500.5,
        porcentajeSena: 25,
        diasSemana: 'LUNES',
        horaInicio: '10:00:00',
        horaFin: '11:00:00',
      },
    ]);
  });

  it('fuerza seña cero para un amenity gratuito', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completar(fixture, 'amenity-nombre', ' SUM ');
    const gratuito = fixture.nativeElement.querySelector('#amenity-gratuito') as HTMLInputElement;
    gratuito.checked = true;
    gratuito.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    completar(fixture, 'amenity-hora-inicio', '10:00');
    completar(fixture, 'amenity-hora-fin', '11:00');
    seleccionarPrimerDia(fixture);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      expect.objectContaining({ montoHora: 0, porcentajeSena: 0 }),
    ]);
  });

  it('rechaza una seña fuera de rango en un amenity pago', () => {
    const fixture = crear();
    completar(fixture, 'amenity-nombre', ' Cancha ');
    completar(fixture, 'amenity-monto-hora', '100');
    completar(fixture, 'amenity-porcentaje-sena', '0');
    completar(fixture, 'amenity-hora-inicio', '10:00');
    completar(fixture, 'amenity-hora-fin', '11:00');
    seleccionarPrimerDia(fixture);

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('.formulario-amenity__error')
        .classList.contains('formulario-amenity__error--visible'),
    ).toBe(true);
  });
});
