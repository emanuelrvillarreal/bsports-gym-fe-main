import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { SelectComponent } from '../../../ui/select/select.component';
import { FormularioDescuentoComponent } from './formulario-descuento.component';

describe('FormularioDescuentoComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioDescuentoComponent] });
    const fixture = TestBed.createComponent(FormularioDescuentoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('rechaza datos incompletos sin emitir', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([]);
  });

  it('normaliza y emite un descuento porcentual', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    const titulo = fixture.nativeElement.querySelector('#descuento-titulo') as HTMLInputElement;
    titulo.value = '  Convenio  ';
    titulo.dispatchEvent(new Event('input'));
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('PORCENTAJE');
    fixture.detectChanges();
    const porcentaje = fixture.nativeElement.querySelector(
      '#descuento-porcentaje',
    ) as HTMLInputElement;
    porcentaje.value = '20';
    porcentaje.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([
      { titulo: 'Convenio', tipoValor: 'PORCENTAJE', porcentaje: 20, montoFijo: null },
    ]);
  });

  it('precarga una edición de monto fijo', () => {
    const fixture = crear();
    fixture.componentRef.setInput('descuento', {
      descuentoUuid: 'd-1',
      titulo: 'Beneficio',
      tipoValor: 'MONTO_FIJO',
      porcentaje: null,
      montoFijo: 1500,
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('#descuento-titulo') as HTMLInputElement).value,
    ).toBe('Beneficio');
    expect(
      (fixture.nativeElement.querySelector('#descuento-monto-fijo') as HTMLInputElement).value,
    ).toBe('1500');
  });
});
