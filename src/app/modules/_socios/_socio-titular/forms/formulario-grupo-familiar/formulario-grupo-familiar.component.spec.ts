import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { SelectComponent } from '../../../../ui/select/select.component';
import { FormularioGrupoFamiliarComponent } from './formulario-grupo-familiar.component';

describe('FormularioGrupoFamiliarComponent', () => {
  function crearFormulario() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioGrupoFamiliarComponent] });
    const fixture = TestBed.createComponent(FormularioGrupoFamiliarComponent);
    fixture.detectChanges();
    return fixture;
  }

  function completarCampo(fixture: ReturnType<typeof crearFormulario>, id: string, valor: string) {
    const campo = fixture.nativeElement.querySelector(`#${id} input, input#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('mantiene el error como primer hijo y rechaza un formulario incompleto', () => {
    const fixture = crearFormulario();
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(formulario.firstElementChild?.getAttribute('role')).toBe('alert');
    expect(formulario.firstElementChild?.classList).toContain(
      'formulario-grupo-familiar__error--visible',
    );
  });

  it('normaliza los campos y emite el payload tipado', () => {
    const fixture = crearFormulario();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completarCampo(fixture, 'grupo-familiar-nombre', ' Ana ');
    completarCampo(fixture, 'grupo-familiar-apellido', ' Pérez ');
    completarCampo(fixture, 'grupo-familiar-email', ' ANA@EXAMPLE.COM ');
    completarCampo(fixture, 'grupo-familiar-password', 'secreto');
    completarCampo(fixture, 'grupo-familiar-confirmar-password', 'secreto');
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('HIJA');

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        modo: 'alta',
        datos: {
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@example.com',
          parentesco: 'HIJA',
          password: 'secreto',
        },
      },
    ]);
  });

  it('formatea DNI y teléfono, pero emite ambos campos sin formato', () => {
    const fixture = crearFormulario();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completarCampo(fixture, 'grupo-familiar-nombre', 'Ana123');
    completarCampo(fixture, 'grupo-familiar-apellido', 'Pérez9');
    completarCampo(fixture, 'grupo-familiar-email', 'ana@example.com');
    completarCampo(fixture, 'grupo-familiar-dni', '47.444.606');
    completarCampo(fixture, 'grupo-familiar-telefono', '11 9876-5432');
    completarCampo(fixture, 'grupo-familiar-password', 'secreto');
    completarCampo(fixture, 'grupo-familiar-confirmar-password', 'secreto');
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('HIJA');
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('input#grupo-familiar-nombre') as HTMLInputElement).value).toBe('Ana');
    expect((fixture.nativeElement.querySelector('input#grupo-familiar-dni') as HTMLInputElement).value).toBe('47.444.606');
    expect((fixture.nativeElement.querySelector('input#grupo-familiar-telefono') as HTMLInputElement).value).toBe('11 9876-5432');

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      expect.objectContaining({
        modo: 'alta',
        datos: expect.objectContaining({
          nombre: 'Ana',
          apellido: 'Pérez',
          dni: '47444606',
          telefono: '1198765432',
        }),
      }),
    ]);
  });

  it('precarga y emite la edición sin solicitar ni incluir contraseñas', () => {
    const fixture = crearFormulario();
    fixture.componentRef.setInput('modo', 'edicion');
    fixture.componentRef.setInput('familiar', {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ANA@EXAMPLE.COM',
      parentesco: 'HIJA',
      dni: '47444606',
      telefono: '1198765432',
      fechaNacimiento: '10/05/2000',
    });
    fixture.detectChanges();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    expect((fixture.nativeElement.querySelector('#grupo-familiar-nombre') as HTMLInputElement).value).toBe('Ana');
    expect((fixture.nativeElement.querySelector('#grupo-familiar-dni') as HTMLInputElement).value).toBe('47.444.606');
    expect((fixture.nativeElement.querySelector('#grupo-familiar-fecha-nacimiento input') as HTMLInputElement).value).toBe('2000-05-10');
    expect(fixture.nativeElement.querySelector('#grupo-familiar-password')).toBeNull();

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        modo: 'edicion',
        datos: {
          nombre: 'Ana',
          apellido: 'Pérez',
          telefono: '1198765432',
          fechaNacimiento: '2000-05-10',
        },
      },
    ]);
  });
});
