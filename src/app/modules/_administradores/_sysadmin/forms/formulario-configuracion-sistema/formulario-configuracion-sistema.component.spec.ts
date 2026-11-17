import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FormularioConfiguracionSistemaComponent } from './formulario-configuracion-sistema.component';

describe('FormularioConfiguracionSistemaComponent', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioConfiguracionSistemaComponent] });
    const fixture = TestBed.createComponent(FormularioConfiguracionSistemaComponent);
    fixture.detectChanges();
    return fixture;
  }
  function completar(fixture: ReturnType<typeof crear>, selector: string, valor: string) {
    const input = fixture.nativeElement.querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  it('valida clave y valor obligatorios', () => {
    const fixture = crear();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(form.firstElementChild?.classList).toContain(
      'formulario-configuracion-sistema__error--visible',
    );
  });
  it('emite la configuración normalizada', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    completar(fixture, '#configuracion-sistema-nombre', ' clave.demo ');
    completar(fixture, '#configuracion-sistema-valor', ' activo ');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([{ name: 'clave.demo', value: 'activo', global: false }]);
  });
});
