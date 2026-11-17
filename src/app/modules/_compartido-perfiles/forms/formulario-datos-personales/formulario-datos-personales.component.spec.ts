import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { FormularioDatosPersonalesComponent } from './formulario-datos-personales.component';

describe('FormularioDatosPersonalesComponent', () => {
  it('convierte la fecha de nacimiento de la API al formato del input', () => {
    TestBed.configureTestingModule({
      imports: [FormularioDatosPersonalesComponent],
      providers: [{ provide: ThemeModeService, useValue: { resolvedMode: signal<'light' | 'dark'>('light') } }],
    });
    const fixture = TestBed.createComponent(FormularioDatosPersonalesComponent);
    fixture.componentRef.setInput('perfil', {
      nombre: 'Ana',
      apellido: 'Perez',
      dni: '30111222',
      email: 'ana@example.com',
      fechaNacimiento: '02/01/1990',
    });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#perfil-fecha-nacimiento input') as HTMLInputElement).value,
    ).toBe('1990-01-02');
  });

  function crearFormulario() {
    TestBed.configureTestingModule({
      imports: [FormularioDatosPersonalesComponent],
      providers: [{ provide: ThemeModeService, useValue: { resolvedMode: signal<'light' | 'dark'>('light') } }],
    });
    const fixture = TestBed.createComponent(FormularioDatosPersonalesComponent);
    fixture.componentRef.setInput('perfil', {
      nombre: 'Ana', apellido: 'Pérez', dni: '30111222', email: 'ana@example.com', telefono: '11 1234-5678', fechaNacimiento: '1990-01-02',
    });
    fixture.detectChanges();
    return fixture;
  }

  it('muestra DNI y email como campos de solo lectura', () => {
    const fixture = crearFormulario();
    const primerosCampos = Array.from(
      fixture.nativeElement.querySelectorAll('input'),
      (input: Element) => input.id,
    ).slice(0, 2);

    expect((fixture.nativeElement.querySelector('#perfil-dni') as HTMLInputElement).readOnly).toBe(true);
    expect((fixture.nativeElement.querySelector('#perfil-email') as HTMLInputElement).readOnly).toBe(true);
    expect(primerosCampos).toEqual(['perfil-dni', 'perfil-email']);
  });

  it('rechaza campos obligatorios vacíos', () => {
    const fixture = crearFormulario();
    const nombre = fixture.nativeElement.querySelector('#perfil-nombre') as HTMLInputElement;
    nombre.value = '';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Completá todos los campos obligatorios.');
  });

  it('formatea y emite el payload normalizado', () => {
    const fixture = crearFormulario();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    const telefono = fixture.nativeElement.querySelector('#perfil-telefono') as HTMLInputElement;
    telefono.value = '+54 9 (11) 1234-5678';
    telefono.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([{ nombre: 'Ana', apellido: 'Pérez', telefono: '5491112345678', fechaNacimiento: '1990-01-02' }]);
  });
});
