import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FormularioUsuarioInternoComponent } from './formulario-usuario-interno.component';

describe('FormularioUsuarioInternoComponent', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioUsuarioInternoComponent] });
    const fixture = TestBed.createComponent(FormularioUsuarioInternoComponent);
    fixture.detectChanges();
    return fixture;
  }
  function completar(fixture: ReturnType<typeof crear>, id: string, valor: string) {
    const elemento = fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    const input =
      elemento instanceof HTMLInputElement
        ? elemento
        : (elemento.querySelector('input') as HTMLInputElement);
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  it('muestra error al enviar los obligatorios vacíos', () => {
    const fixture = crear();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(form.firstElementChild?.classList).toContain(
      'formulario-usuario-interno__error--visible',
    );
  });
  it('normaliza y emite el payload', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    completar(fixture, 'usuario-interno-nombre', ' Ana ');
    completar(fixture, 'usuario-interno-apellido', ' Pérez ');
    completar(fixture, 'usuario-interno-email', ' ANA@EXAMPLE.COM ');
    completar(fixture, 'usuario-interno-password', 'secreto');
    completar(fixture, 'usuario-interno-dni', '30.123.456');
    completar(fixture, 'usuario-interno-telefono', '1123456789');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([
      {
        modo: 'crear',
        datos: {
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@example.com',
          password: 'secreto',
          dni: '30123456',
          telefono: '11 2345-6789',
        },
      },
    ]);
  });

  it('precarga edición, oculta campos de alta y emite sólo cambios', () => {
    TestBed.configureTestingModule({ imports: [FormularioUsuarioInternoComponent] });
    const fixture = TestBed.createComponent(FormularioUsuarioInternoComponent);
    fixture.componentRef.setInput('modo', 'editar');
    fixture.componentRef.setInput('usuarioInicial', {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      dni: '30123456',
      telefono: '11 2345-6789',
    });
    const resultados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((resultado) => resultados.push(resultado));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#usuario-interno-password')).toBeNull();
    expect(fixture.nativeElement.querySelector('#usuario-interno-fecha-nacimiento')).toBeNull();
    completar(fixture, 'usuario-interno-nombre', 'Ana María');
    completar(fixture, 'usuario-interno-telefono', '');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(resultados).toEqual([
      { modo: 'editar', datos: { nombre: 'Ana María', telefono: '' } },
    ]);
  });

  it('no emite una edición sin cambios', () => {
    TestBed.configureTestingModule({ imports: [FormularioUsuarioInternoComponent] });
    const fixture = TestBed.createComponent(FormularioUsuarioInternoComponent);
    fixture.componentRef.setInput('modo', 'editar');
    fixture.componentRef.setInput('usuarioInicial', {
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', dni: '30123456', telefono: null,
    });
    const resultados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((resultado) => resultados.push(resultado));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(resultados).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No hay cambios para guardar.');
  });

  it('impide escribir números en nombre y apellido y limita el DNI a 11 dígitos', () => {
    const fixture = crear();
    completar(fixture, 'usuario-interno-nombre', 'Ana123');
    completar(fixture, 'usuario-interno-apellido', 'Pérez 45');
    completar(fixture, 'usuario-interno-dni', '123456789012345');

    expect(
      (fixture.nativeElement.querySelector('#usuario-interno-nombre') as HTMLInputElement).value,
    ).toBe('Ana');
    expect(
      (fixture.nativeElement.querySelector('#usuario-interno-apellido') as HTMLInputElement).value,
    ).toBe('Pérez ');
    expect(
      (fixture.nativeElement.querySelector('#usuario-interno-dni') as HTMLInputElement).value,
    ).toBe('12.345.678.901');
  });

  it('no emite cuando el DNI tiene menos de 7 dígitos', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'usuario-interno-nombre', 'Ana');
    completar(fixture, 'usuario-interno-apellido', 'Pérez');
    completar(fixture, 'usuario-interno-email', 'ana@example.com');
    completar(fixture, 'usuario-interno-password', 'secreto');
    completar(fixture, 'usuario-interno-dni', '123456');

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([]);
  });

  it('no emite cuando el email no respeta el formato requerido', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'usuario-interno-nombre', 'Ana');
    completar(fixture, 'usuario-interno-apellido', 'Pérez');
    completar(fixture, 'usuario-interno-email', 'ana@dominio');
    completar(fixture, 'usuario-interno-password', 'secreto');
    completar(fixture, 'usuario-interno-dni', '30123456');

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([]);
  });
});
