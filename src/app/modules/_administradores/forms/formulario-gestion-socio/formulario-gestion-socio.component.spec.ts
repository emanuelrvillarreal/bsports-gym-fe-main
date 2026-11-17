import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SelectComponent } from '../../../ui/select/select.component';
import { FormularioGestionSocioComponent } from './formulario-gestion-socio.component';

describe('FormularioGestionSocioComponent', () => {
  it('convierte una fecha dd/MM/yyyy de la API al editar un socio', () => {
    TestBed.configureTestingModule({ imports: [FormularioGestionSocioComponent] });
    const fixture = TestBed.createComponent(FormularioGestionSocioComponent);
    fixture.componentRef.setInput('modo', 'editar');
    fixture.componentRef.setInput('socio', {
      memberUuid: 'member-1',
      nombre: 'Ana',
      apellido: 'Perez',
      email: 'ana@example.com',
      dni: '12345678',
      fechaNacimiento: '15/01/1990',
      parentesco: null,
      estado: 'ACTIVO',
    });
    fixture.detectChanges();

    expect(leerFecha(fixture.nativeElement, 'socio-fecha-nacimiento')).toBe('1990-01-15');
  });

  function crear(modo: 'titular' | 'familiar' | 'editar' = 'titular', socio?: SocioDto) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({ imports: [FormularioGestionSocioComponent] });
    const fixture = TestBed.createComponent(FormularioGestionSocioComponent);
    fixture.componentRef.setInput('modo', modo);
    if (socio) fixture.componentRef.setInput('socio', socio);
    fixture.detectChanges();
    return fixture;
  }
  function completar(fixture: ReturnType<typeof crear>, id: string, valor: string) {
    const elemento = fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    const segmentos = elemento.querySelectorAll<HTMLInputElement>('.input-fecha__segmento');
    if (segmentos.length) {
      // app-input-fecha: día, mes y año van en campos separados.
      const [anio, mes, dia] = valor.split('-');
      [dia, mes, anio].forEach((parte, indice) => escribir(segmentos[indice], parte));
      return;
    }
    // Componentes que envuelven el input real (p. ej. app-input-password).
    const input = elemento instanceof HTMLInputElement ? elemento : elemento.querySelector('input');
    escribir(input as HTMLInputElement, valor);
  }
  function escribir(input: HTMLInputElement, valor: string) {
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function leerFecha(raiz: HTMLElement, id: string): string {
    const segmentos = raiz.querySelectorAll<HTMLInputElement>(`#${id} .input-fecha__segmento`);
    return `${segmentos[2].value}-${segmentos[1].value}-${segmentos[0].value}`;
  }
  it('valida los campos obligatorios', () => {
    const fixture = crear();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(form.firstElementChild?.classList).toContain('formulario-gestion-socio__error--visible');
  });
  it('emite un alta de titular normalizada', () => {
    const fixture = crear();
    const payloads: Array<{
      modo: string;
      datos: {
        nombre?: string;
        email?: string;
        password?: string;
        dni?: string;
        fechaAlta?: string;
      };
    }> = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    completar(fixture, 'socio-nombre', ' Ana ');
    completar(fixture, 'socio-apellido', ' Pérez ');
    completar(fixture, 'socio-email', ' ana@example.com ');
    completar(fixture, 'socio-password', 'secreto');
    completar(fixture, 'socio-dni', '12345678');
    completar(fixture, 'socio-fecha-nacimiento', '1990-01-15');
    expect(
      (fixture.nativeElement.querySelector('#socio-dni') as HTMLInputElement).value,
    ).toBe('12.345.678');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads[0]?.modo).toBe('titular');
    expect(payloads[0]?.datos).toMatchObject({
      nombre: 'Ana',
      email: 'ana@example.com',
      password: 'secreto',
      dni: '12345678',
      fechaNacimiento: '1990-01-15',
    });
    // Sin número elegido no se envía: el backend asigna el siguiente libre.
    expect(payloads[0]?.datos).not.toHaveProperty('numeroSocio');
    expect(payloads[0]?.datos.fechaAlta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('emite un alta de familiar sin datos del titular', () => {
    const fixture = crear('familiar');
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completar(fixture, 'socio-nombre', ' Luis ');
    completar(fixture, 'socio-apellido', ' Pérez ');
    completar(fixture, 'socio-email', ' luis@example.com ');
    completar(fixture, 'socio-password', 'secreto');
    completar(fixture, 'socio-dni', '40111222');
    completar(fixture, 'socio-fecha-nacimiento', '2010-01-15');
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('HIJO');

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      modo: 'familiar',
      datos: {
        parentesco: 'HIJO',
        nombre: 'Luis',
        apellido: 'Pérez',
        email: 'luis@example.com',
        password: 'secreto',
        dni: '40111222',
        fechaNacimiento: '2010-01-15',
      },
    });
    expect(payloads[0]).not.toHaveProperty('datos.titularMemberUuid');
  });

  it('incluye los descuentos opcionales en el alta administrativa', () => {
    const fixture = crear();
    fixture.componentRef.setInput('descuentosDisponibles', [
      {
        descuentoUuid: 'descuento-1',
        titulo: 'Convenio Empresa X',
        tipoValor: 'PORCENTAJE',
        porcentaje: 20,
        montoFijo: null,
      },
    ]);
    fixture.detectChanges();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completar(fixture, 'socio-nombre', 'Ana');
    completar(fixture, 'socio-apellido', 'Pérez');
    completar(fixture, 'socio-email', 'ana@example.com');
    completar(fixture, 'socio-password', 'secreto');
    completar(fixture, 'socio-dni', '12345678');
    completar(fixture, 'socio-fecha-nacimiento', '1990-01-15');
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('descuento-1');
    completar(fixture, 'selector-descuento-desde', '2026-09-01');
    completar(fixture, 'selector-descuento-hasta', '2026-12-31');

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      modo: 'titular',
      datos: {
        descuentos: [
          {
            descuentoUuid: 'descuento-1',
            fechaDesde: '2026-09-01',
            fechaHasta: '2026-12-31',
          },
        ],
      },
    });
  });

  it('inicializa la vigencia del descuento con la fecha local actual en un alta', () => {
    const fixture = crear();
    const componente = fixture.componentInstance as unknown as {
      descuentoFechaDesde(): string;
    };
    const hoy = new Date();
    const fechaEsperada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;

    expect(componente.descuentoFechaDesde()).toBe(fechaEsperada);
  });

  it('no muestra descuentos durante la edición', () => {
    const fixture = crear('editar', {
      memberUuid: 'member-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      dni: '12345678',
      fechaNacimiento: '1990-01-15',
      parentesco: null,
      estado: 'ACTIVO',
    });
    fixture.componentRef.setInput('descuentosDisponibles', [
      {
        descuentoUuid: 'descuento-1',
        titulo: 'Convenio',
        tipoValor: 'PORCENTAJE',
        porcentaje: 10,
        montoFijo: null,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.formulario-gestion-socio__descuentos')).toBeNull();
  });

  it('precarga y emite la edición de un socio titular', () => {
    const fixture = crear('editar', {
      memberUuid: 'member-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      dni: '12345678',
      telefono: '1122334455',
      fechaNacimiento: '1990-01-15',
      numeroSocio: 'SOC-10',
      parentesco: null,
      estado: 'ACTIVO',
    });
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    expect(
      (fixture.nativeElement.querySelector('#socio-dni') as HTMLInputElement).value,
    ).toBe('12.345.678');
    expect(leerFecha(fixture.nativeElement, 'socio-fecha-nacimiento')).toBe('1990-01-15');

    completar(fixture, 'socio-nombre', ' Ana María ');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        modo: 'editar',
        datos: {
          nombre: 'Ana María',
          apellido: 'Pérez',
          email: 'ana@example.com',
          dni: '12345678',
          telefono: '1122334455',
          fechaNacimiento: '1990-01-15',
        },
      },
    ]);
  });

  function completarTitular(fixture: ReturnType<typeof crear>) {
    completar(fixture, 'socio-nombre', 'Ana');
    completar(fixture, 'socio-apellido', 'Pérez');
    completar(fixture, 'socio-email', 'ana@example.com');
    completar(fixture, 'socio-password', 'secreto');
    completar(fixture, 'socio-dni', '12345678');
    completar(fixture, 'socio-fecha-nacimiento', '1990-01-15');
  }
  function enviar(fixture: ReturnType<typeof crear>) {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('en el alta de titular muestra el siguiente número y envía el elegido', () => {
    const fixture = crear();
    fixture.componentRef.setInput('siguienteNumeroSocio', '42');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#socio-numero') as HTMLInputElement;
    expect(input.placeholder).toBe('42');
    expect(fixture.nativeElement.querySelector('#socio-numero-ayuda').textContent).toContain('se asigna el 42');

    const payloads: Array<{ datos: { numeroSocio?: number } }> = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p as never));
    completarTitular(fixture);
    completar(fixture, 'socio-numero', '5a00');
    expect(input.value).toBe('500');
    enviar(fixture);

    expect(payloads[0]?.datos.numeroSocio).toBe(500);
  });

  it('rechaza el número 0', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    completarTitular(fixture);
    completar(fixture, 'socio-numero', '0');
    enviar(fixture);

    expect(payloads).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('número de socio');
  });

  it('al editar envía el número solo si cambió', () => {
    const fixture = crear('editar', {
      memberUuid: 'member-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      dni: '12345678',
      fechaNacimiento: '1990-01-15',
      numeroSocio: '10',
      parentesco: null,
      estado: 'ACTIVO',
    });
    const payloads: Array<{ datos: { numeroSocio?: number } }> = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p as never));
    expect((fixture.nativeElement.querySelector('#socio-numero') as HTMLInputElement).value).toBe('10');

    enviar(fixture);
    completar(fixture, 'socio-numero', '25');
    enviar(fixture);

    expect(payloads[0]?.datos).not.toHaveProperty('numeroSocio');
    expect(payloads[1]?.datos.numeroSocio).toBe(25);
  });

  it('el alta de familiar no pide número', () => {
    const fixture = crear('familiar');
    expect(fixture.nativeElement.querySelector('#socio-numero')).toBeNull();
  });
});
