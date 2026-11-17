import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { FormularioFinalizacionDescuentoComponent } from './formulario-finalizacion-descuento.component';

describe('FormularioFinalizacionDescuentoComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioFinalizacionDescuentoComponent] });
    const fixture = TestBed.createComponent(FormularioFinalizacionDescuentoComponent);
    fixture.componentRef.setInput('fechaDesde', '2026-09-01');
    fixture.detectChanges();
    return fixture;
  }

  it('rechaza una fecha vacía o anterior al inicio', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const fecha = fixture.debugElement.query(By.directive(InputFechaComponent))
      .componentInstance as InputFechaComponent;
    fecha.valorCambiado.emit('2026-08-31');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([]);
  });

  it('emite la fecha válida exacta', () => {
    const fixture = crear();
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    const fecha = fixture.debugElement.query(By.directive(InputFechaComponent))
      .componentInstance as InputFechaComponent;
    fecha.valorCambiado.emit('2026-12-31');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(enviados).toEqual([{ fecha: '2026-12-31' }]);
  });
});
