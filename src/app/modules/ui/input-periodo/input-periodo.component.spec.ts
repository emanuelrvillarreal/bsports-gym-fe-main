import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { InputPeriodoComponent } from './input-periodo.component';

describe('InputPeriodoComponent', () => {
  function crear(): { componente: InputPeriodoComponent; valores: string[] } {
    const componente = runInInjectionContext(Injector.create({ providers: [] }), () => new InputPeriodoComponent());
    const valores: string[] = [];
    componente.valorCambiado.subscribe((valor) => valores.push(valor));
    return { componente, valores };
  }

  function actualizar(componente: InputPeriodoComponent, metodo: 'actualizarMes' | 'actualizarAnio', valor: string): HTMLInputElement {
    const input = { value: valor } as HTMLInputElement;
  (componente as unknown as Record<string, (evento: Event) => void>)[metodo](
    { target: input } as unknown as Event,
  );
    return input;
  }

  it('emite el período MM-yyyy sólo al completar mes y año válidos', () => {
    const { componente, valores } = crear();
    actualizar(componente, 'actualizarMes', '7');
    actualizar(componente, 'actualizarAnio', '2026');

    expect(valores).toEqual(['07-2026']);
  });

  it('rechaza meses fuera del rango y años futuros', () => {
    const { componente, valores } = crear();
    const mes = actualizar(componente, 'actualizarMes', '13');
    const anio = actualizar(componente, 'actualizarAnio', String(new Date().getFullYear() + 1));

    expect(mes.value).toBe('');
    expect(anio.value).toBe('');
    expect(valores).toEqual([]);
  });

  it('limpia el valor emitido', () => {
    const { componente, valores } = crear();
    actualizar(componente, 'actualizarMes', '12');
    actualizar(componente, 'actualizarAnio', '2026');
    (componente as unknown as { limpiar(): void }).limpiar();

    expect(valores).toEqual(['12-2026', '']);
  });
});
