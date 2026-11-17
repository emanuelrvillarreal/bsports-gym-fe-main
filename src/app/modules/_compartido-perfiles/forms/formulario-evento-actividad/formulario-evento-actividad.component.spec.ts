import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { FormularioEventoActividadComponent } from './formulario-evento-actividad.component';

describe('FormularioEventoActividadComponent', () => {
  it('rechaza el formulario incompleto', () => {
    const fixture = TestBed.createComponent(FormularioEventoActividadComponent);
    const emit = vi.spyOn(fixture.componentInstance.enviado, 'emit');

    (fixture.componentInstance as any).enviar({ preventDefault: vi.fn() });

    expect(emit).not.toHaveBeenCalled();
    expect((fixture.componentInstance as any).error()).toContain('obligatorios');
  });

  it('normaliza y emite el payload válido', () => {
    const fixture = TestBed.createComponent(FormularioEventoActividadComponent);
    const component = fixture.componentInstance as any;
    const emit = vi.spyOn(fixture.componentInstance.enviado, 'emit');
    component.actividadUuid.set('actividad-1');
    component.titulo.set(' Clase especial ');
    component.descripcion.set(' Repaso ');
    component.ubicacion.set(' Sala 2 ');
    component.inicio.set('2026-06-20T10:00');
    component.fin.set('2026-06-20T12:00');

    component.enviar({ preventDefault: vi.fn() });

    expect(emit).toHaveBeenCalledWith({
      actividadUuid: 'actividad-1',
      titulo: 'Clase especial',
      descripcion: 'Repaso',
      ubicacion: 'Sala 2',
      inicio: '20/06/2026 10:00:00',
      fin: '20/06/2026 12:00:00',
    });
  });

  it('autocompleta el fin una hora después al cambiar el inicio', () => {
    const fixture = TestBed.createComponent(FormularioEventoActividadComponent);
    const component = fixture.componentInstance as any;

    component.actualizarInicio('2026-06-20T10:30');

    expect(component.inicio()).toBe('2026-06-20T10:30');
    expect(component.fin()).toBe('2026-06-20T11:30');
  });

  it('rechaza un inicio igual o posterior al fin', () => {
    const fixture = TestBed.createComponent(FormularioEventoActividadComponent);
    const component = fixture.componentInstance as any;
    const emit = vi.spyOn(fixture.componentInstance.enviado, 'emit');
    component.actividadUuid.set('actividad-1');
    component.titulo.set('Clase especial');
    component.ubicacion.set('Sala 2');
    component.inicio.set('2026-06-20T12:00');
    component.fin.set('2026-06-20T11:00');

    component.enviar({ preventDefault: vi.fn() });

    expect(emit).not.toHaveBeenCalled();
    expect(component.error()).toContain('inicio debe ser anterior');
  });
});
