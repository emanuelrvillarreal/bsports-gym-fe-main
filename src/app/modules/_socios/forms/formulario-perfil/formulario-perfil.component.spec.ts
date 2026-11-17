import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { FormularioPerfilComponent } from './formulario-perfil.component';

describe('FormularioPerfilComponent', () => {
  it('convierte una fecha dd/MM/yyyy de la API al formato del input', () => {
    TestBed.configureTestingModule({
      imports: [FormularioPerfilComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'light' | 'dark'>('light') },
        },
      ],
    });
    const fixture = TestBed.createComponent(FormularioPerfilComponent);
    fixture.componentRef.setInput('perfil', {
      nombre: 'Ana',
      apellido: 'Perez',
      fechaNacimiento: '02/01/1990',
    });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#perfil-fecha-nacimiento') as HTMLInputElement).value,
    ).toBe('1990-01-02');
  });

  function crearFormulario() {
    TestBed.configureTestingModule({
      imports: [FormularioPerfilComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'light' | 'dark'>('light') },
        },
      ],
    });
    const fixture = TestBed.createComponent(FormularioPerfilComponent);
    fixture.componentRef.setInput('perfil', {
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: '1111',
      fechaNacimiento: '1990-01-02',
      email: 'ana@example.com',
      dni: '12345678',
      numeroSocio: '42',
    });
    fixture.detectChanges();
    return fixture;
  }

  it('mantiene el error como primer hijo y valida los campos obligatorios', () => {
    const fixture = crearFormulario();
    const nombre = fixture.nativeElement.querySelector('#perfil-nombre') as HTMLInputElement;
    nombre.value = '';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(formulario.firstElementChild?.getAttribute('role')).toBe('alert');
    expect(formulario.firstElementChild?.classList).toContain('formulario-perfil__error--visible');
    expect(formulario.textContent).toContain('Nombre y apellido son obligatorios.');
  });

  it('emite únicamente el payload editable normalizado', () => {
    const fixture = crearFormulario();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    const telefono = fixture.nativeElement.querySelector('#perfil-telefono') as HTMLInputElement;
    telefono.value = ' 2222 ';
    telefono.dispatchEvent(new Event('input', { bubbles: true }));
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        nombre: 'Ana',
        apellido: 'Pérez',
        dni: '12345678',
        email: 'ana@example.com',
        telefono: '2222',
        fechaNacimiento: '1990-01-02',
      },
    ]);
  });
});
