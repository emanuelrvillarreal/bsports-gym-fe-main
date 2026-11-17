import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputHoraComponent } from './input-hora.component';

describe('InputHoraComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputHoraComponent] });
  });

  it('muestra y edita la hora en segmentos con formato de 24 horas', () => {
    const fixture = TestBed.createComponent(InputHoraComponent);
    fixture.componentRef.setInput('inputId', 'hora-inicio');
    fixture.componentRef.setInput('etiqueta', 'Hora de inicio');
    fixture.componentRef.setInput('valor', '10:30');
    const valores: string[] = [];
    fixture.componentInstance.valorCambiado.subscribe((valor) => valores.push(valor));
    fixture.detectChanges();

    const segmentos = fixture.nativeElement.querySelectorAll(
      '.input-hora__segmento',
    ) as NodeListOf<HTMLInputElement>;
    expect([...segmentos].map((segmento) => segmento.value)).toEqual(['10', '30']);
    expect(segmentos[0].type).toBe('text');

    segmentos[0].value = '17';
    segmentos[0].dispatchEvent(new Event('input', { bubbles: true }));

    expect(valores).toEqual(['17:30']);
    expect(fixture.nativeElement.querySelector('ng-icon[name="heroClock"]')).not.toBeNull();
  });

  it('conserva un valor parcial mientras se reemplaza una hora existente', () => {
    const fixture = TestBed.createComponent(InputHoraComponent);
    fixture.componentRef.setInput('valor', '11:11');
    fixture.componentRef.setInput('minimo', '10:00');
    fixture.componentRef.setInput('maximo', '20:00');
    const emitir = vi.spyOn(fixture.componentInstance.valorCambiado, 'emit');
    fixture.detectChanges();

    const hora = fixture.nativeElement.querySelector(
      '.input-hora__segmento',
    ) as HTMLInputElement;
    hora.value = '1';
    hora.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(hora.value).toBe('1');
    expect(emitir).not.toHaveBeenCalled();

    hora.value = '17';
    hora.dispatchEvent(new Event('input', { bubbles: true }));

    expect(emitir).toHaveBeenCalledWith('17:11');
    expect(hora.validity.valid).toBe(true);
  });

  it('permite corregir una hora fuera del rango sin reemplazarla automáticamente', () => {
    const fixture = TestBed.createComponent(InputHoraComponent);
    fixture.componentRef.setInput('minimo', '10:00');
    fixture.componentRef.setInput('maximo', '20:00');
    const emitir = vi.spyOn(fixture.componentInstance.valorCambiado, 'emit');
    fixture.detectChanges();

    const [hora, minuto] = fixture.nativeElement.querySelectorAll(
      '.input-hora__segmento',
    ) as NodeListOf<HTMLInputElement>;
    hora.value = '09';
    hora.dispatchEvent(new Event('input', { bubbles: true }));
    minuto.value = '30';
    minuto.dispatchEvent(new Event('input', { bubbles: true }));

    expect(hora.value).toBe('09');
    expect(hora.validity.valid).toBe(false);
    expect(emitir).not.toHaveBeenCalled();

    hora.value = '17';
    hora.dispatchEvent(new Event('input', { bubbles: true }));

    expect(emitir).toHaveBeenCalledWith('17:30');
    expect(hora.validity.valid).toBe(true);
  });
});
