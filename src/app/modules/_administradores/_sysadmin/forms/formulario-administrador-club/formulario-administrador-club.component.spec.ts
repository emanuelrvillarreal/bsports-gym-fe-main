import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FormularioAdministradorClubComponent } from './formulario-administrador-club.component';

describe('FormularioAdministradorClubComponent', () => {
  it('emite el alta con los campos del contrato y omite opcionales vacios', () => {
    TestBed.configureTestingModule({ imports: [FormularioAdministradorClubComponent] });
    const fixture = TestBed.createComponent(FormularioAdministradorClubComponent);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    const valores = {
      '#administrador-club-nombre': ' Ana ',
      '#administrador-club-apellido': ' Perez ',
      '#administrador-club-email': ' ANA@EXAMPLE.COM ',
      '#administrador-club-dni': '30.111.222',
    };
    for (const [selector, valor] of Object.entries(valores)) {
      const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    (
      fixture.componentInstance as unknown as { password: { set(valor: string): void } }
    ).password.set('Cambiar123');
    fixture.nativeElement
      .querySelector('#formulario-administrador-club')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([
      {
        modo: 'crear',
        datos: {
          nombre: 'Ana',
          apellido: 'Perez',
          dni: '30111222',
          email: 'ana@example.com',
          password: 'Cambiar123',
        },
      },
    ]);
  });

  it('en edicion precarga y emite todos los campos editables salvo la contrasena', () => {
    TestBed.configureTestingModule({ imports: [FormularioAdministradorClubComponent] });
    const fixture = TestBed.createComponent(FormularioAdministradorClubComponent);
    fixture.componentRef.setInput('modo', 'editar');
    fixture.componentRef.setInput('administrador', {
      userUuid: 'user-1',
      nombre: 'Ana',
      apellido: 'Perez',
      dni: '30111222',
      email: 'ana@example.com',
      telefono: '1140001000',
      fechaNacimiento: '1990-01-01',
    });
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    const valores = {
      '#administrador-club-nombre': 'Ana Maria',
      '#administrador-club-email': ' ANA.MARIA@EXAMPLE.COM ',
      '#administrador-club-dni': '30.111.223',
    };
    for (const [selector, valor] of Object.entries(valores)) {
      const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    (
      fixture.componentInstance as unknown as { fechaNacimiento: { set(valor: string): void } }
    ).fechaNacimiento.set('1991-02-02');
    fixture.nativeElement
      .querySelector('#formulario-administrador-club')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([
      {
        modo: 'editar',
        datos: {
          nombre: 'Ana Maria',
          dni: '30111223',
          email: 'ana.maria@example.com',
          fechaNacimiento: '1991-02-02',
        },
      },
    ]);
  });
});
