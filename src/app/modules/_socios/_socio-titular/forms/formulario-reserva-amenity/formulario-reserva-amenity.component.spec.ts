import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AmenityDto } from '../../../../../core/api/interfaces/amenities.interfaces';
import { FormularioReservaAmenityComponent } from './formulario-reserva-amenity.component';

const AMENITY: AmenityDto = {
  amenityUuid: 'amenity-1', nombre: 'Quincho', montoHora: 1000, porcentajeSena: 30,
  diasSemana: 'VIERNES;SABADO', horaInicio: '10:00:00', horaFin: '20:00:00',
};

describe('FormularioReservaAmenityComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
  });

  function crear(): { fixture: ComponentFixture<FormularioReservaAmenityComponent>; componente: FormularioReservaAmenityComponent } {
    TestBed.configureTestingModule({ imports: [FormularioReservaAmenityComponent] });
    const fixture = TestBed.createComponent(FormularioReservaAmenityComponent);
    fixture.componentRef.setInput('amenity', AMENITY);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance };
  }

  it('completa el fin una hora después del inicio', () => {
    const { componente } = crear();
    componente['actualizarHoraDesde']('18:20');
    expect(componente['horaHasta']()).toBe('19:20');
  });

  it('limita el fin al horario de cierre del amenity', () => {
    const { componente } = crear();
    componente['actualizarHoraDesde']('19:20');
    expect(componente['horaHasta']()).toBe('20:00');
  });

  it('corrige el inicio al horario de apertura cuando se ingresa una hora menor', () => {
    const { componente } = crear();

    componente['actualizarHoraDesde']('09:30');

    expect(componente['horaDesde']()).toBe('10:00');
    expect(componente['horaHasta']()).toBe('11:00');
  });

  it('no emite un rango cuya fecha final no es posterior', () => {
    const { componente } = crear();
    const emitido: unknown[] = [];
    componente.enviado.subscribe((payload) => emitido.push(payload));
    componente['fecha'].set('2026-08-28');
    componente['horaDesde'].set('18:00');
    componente['horaHasta'].set('18:00');
    componente['enviar']();
    expect(emitido).toEqual([]);
    expect(componente['mensajeError']()).toContain('posterior');
  });

  it('emite el payload ISO sin zona horaria con seña por defecto', () => {
    const { componente } = crear();
    const emitido: unknown[] = [];
    componente.enviado.subscribe((payload) => emitido.push(payload));
    componente['fecha'].set('2026-08-28');
    componente['horaDesde'].set('18:00');
    componente['horaHasta'].set('19:00');
    componente['enviar']();
    expect(emitido).toEqual([{ fechaDesde: '2026-08-28T18:00:00', fechaHasta: '2026-08-28T19:00:00', tipoPago: 'SENA' }]);
  });
});
