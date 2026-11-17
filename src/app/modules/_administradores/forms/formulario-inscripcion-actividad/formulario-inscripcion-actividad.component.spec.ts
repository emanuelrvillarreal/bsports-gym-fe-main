import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { SelectComponent } from '../../../ui/select/select.component';
import { FormularioInscripcionActividadComponent } from './formulario-inscripcion-actividad.component';

describe('FormularioInscripcionActividadComponent', () => {
  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioInscripcionActividadComponent] });
    const fixture = TestBed.createComponent(FormularioInscripcionActividadComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('rechaza el envío sin socio', () => {
    const fixture = crear();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(form.firstElementChild?.classList).toContain(
      'formulario-inscripcion-actividad__error--visible',
    );
  });
  it('emite el UUID del socio seleccionado', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('member-1');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([{ memberUuid: 'member-1' }]);
  });
});
