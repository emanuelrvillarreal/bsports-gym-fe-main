import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { InputFechaComponent } from './input-fecha.component';

describe('InputFechaComponent', () => {
  const crearCampo = (valor: string): HTMLInputElement => {
    const campo = document.createElement('input');
    campo.value = valor;
    return campo;
  };

  const cambiar = (
    component: any,
    segmento: 'dia' | 'mes' | 'anio' | 'hora' | 'minuto',
    valor: string,
  ): HTMLInputElement => {
    const campo = crearCampo(valor);
    component.cambiarSegmento(segmento, { target: campo });
    return campo;
  };

  it('muestra fecha en segmentos numéricos y emite ISO al completar día, mes y año', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    const emitir = vi.spyOn(fixture.componentInstance.valorCambiado, 'emit');

    component.writeValue('2026-09-07');
    expect(component.dia).toBe('07');
    expect(component.mes).toBe('09');
    expect(component.anio).toBe('2026');

    cambiar(component, 'dia', '08');
    cambiar(component, 'mes', '09');
    cambiar(component, 'anio', '2026');

    expect(component.valor).toBe('2026-09-08');
    expect(emitir).toHaveBeenCalledWith('2026-09-08');
  });

  it('permite borrar todos los segmentos de una fecha existente', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    const emitir = vi.spyOn(fixture.componentInstance.valorCambiado, 'emit');

    component.writeValue('2026-09-07');
    cambiar(component, 'dia', '');
    cambiar(component, 'mes', '');
    cambiar(component, 'anio', '');

    expect(component.valor).toBe('');
    expect(emitir).toHaveBeenCalledWith('');
  });

  it('limpia la validación nativa de todos los segmentos al completar una fecha válida', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const segmentos = fixture.nativeElement.querySelectorAll(
      '.input-fecha__segmento',
    ) as NodeListOf<HTMLInputElement>;

    component.writeValue('2026-09-07');
    fixture.detectChanges();
    segmentos[1].setCustomValidity('Ingresá una fecha válida con formato dd/mm/aaaa.');
    component.actualizarValidez('');

    expect([...segmentos].every((segmento) => segmento.validity.valid)).toBe(true);
  });

  it('mantiene los límites al completar los segmentos con una fecha anterior al mínimo', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('minimo', '2026-09-09');

    cambiar(component, 'dia', '08');
    cambiar(component, 'mes', '09');
    const campoAnio = cambiar(component, 'anio', '2026');

    expect(component.dia).toBe('08');
    expect(component.valor).toBe('');
    expect(campoAnio.validity.valid).toBe(false);
  });

  it('respeta los días permitidos al completar los segmentos', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('diasPermitidos', [2]);

    cambiar(component, 'dia', '07');
    cambiar(component, 'mes', '09');
    const campoAnio = cambiar(component, 'anio', '2026');

    expect(component.valor).toBe('');
    expect(campoAnio.validity.valid).toBe(false);
  });

  it('emite fecha y hora ISO cuando se completan sus cinco segmentos', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('modo', 'fecha-hora');

    cambiar(component, 'dia', '07');
    cambiar(component, 'mes', '09');
    cambiar(component, 'anio', '2026');
    cambiar(component, 'hora', '14');
    cambiar(component, 'minuto', '30');

    expect(component.valor).toBe('2026-09-07T14:30');
  });

  it('acepta mes/año en segmentos y rechaza meses mayores a 12', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('modo', 'mes');

    cambiar(component, 'mes', '09');
    cambiar(component, 'anio', '2026');
    expect(component.valor).toBe('2026-09');

    const campoMes = cambiar(component, 'mes', '13');
    expect(campoMes.validity.valid).toBe(false);
  });

  it('usa el selector nativo por defecto al presionar el botón de calendario', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    const mostrarPicker = vi.fn();
    component.campoCalendarioNativo = { nativeElement: { value: '', showPicker: mostrarPicker } };

    component.abrirPicker();

    expect(mostrarPicker).toHaveBeenCalledOnce();
    expect(component.calendarioAbierto()).toBe(false);
  });

  it('cierra el calendario custom al hacer click fuera del control', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    const component = fixture.componentInstance as any;
    const control = document.createElement('span');
    component.controlCalendario = { nativeElement: control };
    component.calendarioAbierto.set(true);

    component.manejarClickFueraCalendario({ target: document.body });

    expect(component.calendarioAbierto()).toBe(false);
  });
});
