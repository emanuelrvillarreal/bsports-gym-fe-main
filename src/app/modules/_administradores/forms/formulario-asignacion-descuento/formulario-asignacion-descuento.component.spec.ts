import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent } from '../../../ui/select/select.component';
import { FormularioAsignacionDescuentoComponent } from './formulario-asignacion-descuento.component';

describe('FormularioAsignacionDescuentoComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioAsignacionDescuentoComponent] });
    const fixture = TestBed.createComponent(FormularioAsignacionDescuentoComponent);
    fixture.componentRef.setInput('descuentos', [
      {
        descuentoUuid: 'd-1',
        titulo: 'Convenio',
        tipoValor: 'PORCENTAJE',
        porcentaje: 10,
        montoFijo: null,
      },
    ]);
    fixture.detectChanges();
    return fixture;
  }

  it('inicializa la vigencia desde con la fecha local actual', () => {
    const fixture = crear();
    const hoy = new Date();
    const fechaEsperada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;
    const fechaDesde = fixture.debugElement.queryAll(By.directive(InputFechaComponent))[0]
      .componentInstance as InputFechaComponent;

    expect(fechaDesde.valorInicial()).toBe(fechaEsperada);
  });

  it('rechaza el envío sin descuento ni fecha inicial', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([]);
  });

  it('emite la asignación sin fecha final como null', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('d-1');
    const fechas = fixture.debugElement.queryAll(By.directive(InputFechaComponent));
    (fechas[0].componentInstance as InputFechaComponent).valorCambiado.emit('2026-09-01');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([
      { descuentoUuid: 'd-1', fechaDesde: '2026-09-01', fechaHasta: null },
    ]);
  });

  it('rechaza una fecha final anterior al inicio', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    (
      fixture.debugElement.query(By.directive(SelectComponent)).componentInstance as SelectComponent
    ).valueChange.emit('d-1');
    const fechas = fixture.debugElement.queryAll(By.directive(InputFechaComponent));
    (fechas[0].componentInstance as InputFechaComponent).valorCambiado.emit('2026-09-10');
    (fechas[1].componentInstance as InputFechaComponent).valorCambiado.emit('2026-09-01');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([]);
  });
});
