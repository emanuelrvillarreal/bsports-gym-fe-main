import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormularioActividadComponent } from './formulario-actividad.component';

describe('FormularioActividadComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioActividadComponent] });
    const fixture = TestBed.createComponent(FormularioActividadComponent);
    fixture.detectChanges();
    return fixture;
  }
  /** Completa la fila `clave` de Horarios con los métodos del componente (el día es un app-select). */
  function completarHorario(
    fixture: ReturnType<typeof crear>,
    clave: number,
    horario: { dia: string; inicio: string; fin: string; cupo: string },
  ) {
    const componente = fixture.componentInstance as unknown as {
      actualizarHorario(clave: number, campo: string, valor: string): void;
    };
    componente.actualizarHorario(clave, 'diaSemana', horario.dia);
    componente.actualizarHorario(clave, 'horaInicio', horario.inicio);
    componente.actualizarHorario(clave, 'horaFin', horario.fin);
    componente.actualizarHorario(clave, 'cupo', horario.cupo);
    fixture.detectChanges();
  }
  function completar(fixture: ReturnType<typeof crear>, id: string, valor: string) {
    const input = fixture.nativeElement.querySelector(`input#${id}`) as HTMLInputElement;
    if (id.startsWith('actividad-horario-inicio') || id.startsWith('actividad-horario-fin')) {
      const segmentos = input.closest('.input-hora__segmentos')?.querySelectorAll('input');
      const [hora, minuto] = valor.split(':');
      if (segmentos?.length === 2) {
        segmentos[0].value = hora;
        segmentos[0].dispatchEvent(new Event('input', { bubbles: true }));
        segmentos[1].value = minuto;
        segmentos[1].dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
      }
      return;
    }
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }
  it('rechaza datos incompletos, desplaza al primer error y marca los campos invalidos', async () => {
    const fixture = crear();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const nombre = fixture.nativeElement.querySelector('#actividad-nombre') as HTMLInputElement;
    const desplazar = vi.fn();
    nombre.scrollIntoView = desplazar;

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(form.firstElementChild?.getAttribute('role')).toBe('alert');
    expect(form.firstElementChild?.classList).toContain('formulario-actividad__error--visible');
    expect(desplazar).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    expect(document.activeElement).toBe(nombre);
    expect(nombre.classList).toContain('app-control--invalido');
    expect(
      fixture.nativeElement.querySelector('#actividad-horario-inicio-0')?.classList,
    ).toContain('app-control--invalido');
  });
  it('emite el payload normalizado de alta', () => {
    const fixture = crear();
    const diasVencimiento = fixture.nativeElement.querySelector('#actividad-dias-vencimiento') as HTMLInputElement;
    expect(diasVencimiento.type).toBe('number');
    expect(diasVencimiento.min).toBe('1');
    expect(diasVencimiento.placeholder).toBe('30');
    expect(fixture.nativeElement.querySelector('.formulario-actividad__periodicidad')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('30 días por defecto');
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    completar(fixture, 'actividad-nombre', ' Yoga ');
    completar(fixture, 'actividad-ubicacion', ' Salón 1 ');
    completarHorario(fixture, 0, { dia: 'LUNES', inicio: '10:00', fin: '11:00', cupo: '20' });
    completar(fixture, 'actividad-importe', '1500');
    expect(
      (fixture.nativeElement.querySelector('#actividad-importe') as HTMLInputElement).value,
    ).toBe('$1.500');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([
      {
        nombre: 'Yoga',
        ubicacion: 'Salón 1',
        horarios: [{ diaSemana: 'LUNES', horaInicio: '10:00:00', horaFin: '11:00:00', cupoMaximo: 20 }],
        importeCuota: 1500,
        periodicidadCuota: 'MENSUAL',
        diaVencimientoFijo: null,
        diaCorteInscripcion: null,
        categoriaUuids: [],
      },
    ]);
  });

  it('solo permite tipear números en el importe', () => {
    const fixture = crear();
    const importe = fixture.nativeElement.querySelector('#actividad-importe') as HTMLInputElement;
    const letra = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    const numero = new KeyboardEvent('keydown', { key: '1', cancelable: true });

    importe.dispatchEvent(letra);
    importe.dispatchEvent(numero);

    expect(letra.defaultPrevented).toBe(true);
    expect(numero.defaultPrevented).toBe(false);
  });

  it('envía los días de vencimiento como número cuando se informan', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'actividad-nombre', 'Yoga');
    completar(fixture, 'actividad-ubicacion', 'Sala 1');
    completarHorario(fixture, 0, { dia: 'LUNES', inicio: '10:00', fin: '11:00', cupo: '20' });
    completar(fixture, 'actividad-importe', '1500');
    completar(fixture, 'actividad-dias-vencimiento', '45');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ diasVencimientoCuota: 45, periodicidadCuota: 'MENSUAL' });
  });

  it('rechaza días de vencimiento menores que uno sin volver obligatorio el campo', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'actividad-nombre', 'Yoga');
    completar(fixture, 'actividad-ubicacion', 'Sala 1');
    completarHorario(fixture, 0, { dia: 'LUNES', inicio: '10:00', fin: '11:00', cupo: '20' });
    completar(fixture, 'actividad-importe', '1500');
    completar(fixture, 'actividad-dias-vencimiento', '0');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([]);
    expect(fixture.nativeElement.querySelector('#actividad-dias-vencimiento').getAttribute('data-app-invalido')).toBe('true');
  });

  it('precarga y emite el payload de edición sin reasignar profesores', () => {
    const fixture = crear();
    fixture.componentRef.setInput('actividad', {
      actividadUuid: 'actividad-1',
      nombre: 'Yoga',
      ubicacion: 'Salón principal',
      cupoMaximo: 20,
      diasSemana: 'LUNES;MIERCOLES',
      horaInicio: '10:00:00',
      horaFin: '11:00:00',
      importeCuota: 1500,
      diasVencimientoCuota: 25,
      periodicidadCuota: 'SEMESTRAL',
      completa: false,
      profesores: [],
      inscriptos: [],
      categorias: [{ categoriaUuid: 'categoria-1', nombre: 'Adultos' }],
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('#actividad-importe') as HTMLInputElement).value,
    ).toBe('$1.500');
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([
      {
        nombre: 'Yoga',
        ubicacion: 'Salón principal',
        // Sin horarios en la respuesta: una fila por día con la franja y el cupo de la actividad.
        horarios: [
          { diaSemana: 'LUNES', horaInicio: '10:00:00', horaFin: '11:00:00', cupoMaximo: 20 },
          { diaSemana: 'MIERCOLES', horaInicio: '10:00:00', horaFin: '11:00:00', cupoMaximo: 20 },
        ],
        importeCuota: 1500,
        periodicidadCuota: 'SEMESTRAL',
        diasVencimientoCuota: 25,
        diaVencimientoFijo: null,
        diaCorteInscripcion: null,
        categoriaUuids: ['categoria-1'],
      },
    ]);
  });

  it('conserva el uuid de cada horario al editar y permite varios horarios el mismo día', () => {
    const fixture = crear();
    fixture.componentRef.setInput('actividad', {
      actividadUuid: 'actividad-1',
      nombre: 'Kung Fu',
      ubicacion: 'Salón 2',
      cupoMaximo: 12,
      diasSemana: 'LUNES',
      horaInicio: '12:00:00',
      horaFin: '13:30:00',
      importeCuota: 15000,
      completa: false,
      profesores: [],
      inscriptos: [],
      horarios: [
        {
          uuid: 'h-1',
          diaSemana: 'LUNES',
          horaInicio: '12:00:00',
          horaFin: '13:30:00',
          cupoMaximo: 2,
          inscriptos: 1,
          disponibles: 1,
        },
      ],
    });
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as {
      agregarHorario(): void;
      horarios(): readonly { clave: number }[];
    };
    componente.agregarHorario();
    fixture.detectChanges();
    const nueva = componente.horarios()[1].clave;
    completarHorario(fixture, nueva, { dia: 'LUNES', inicio: '14:00', fin: '15:30', cupo: '10' });
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      horarios: [
        { uuid: 'h-1', diaSemana: 'LUNES', horaInicio: '12:00:00', horaFin: '13:30:00', cupoMaximo: 2 },
        { diaSemana: 'LUNES', horaInicio: '14:00:00', horaFin: '15:30:00', cupoMaximo: 10 },
      ],
    });
  });

  it('rechaza dos horarios el mismo día a la misma hora', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'actividad-nombre', 'Yoga');
    completar(fixture, 'actividad-ubicacion', 'Sala 1');
    completar(fixture, 'actividad-importe', '1500');
    completarHorario(fixture, 0, { dia: 'LUNES', inicio: '10:00', fin: '11:00', cupo: '20' });
    (fixture.componentInstance as unknown as { agregarHorario(): void }).agregarHorario();
    completarHorario(fixture, 1, { dia: 'LUNES', inicio: '10:00', fin: '11:30', cupo: '5' });

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(payloads).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Hay dos horarios el Lunes a las 10:00');
  });

  it('envía el día fijo de vencimiento y omite los días cuando se elige ese modo', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));
    completar(fixture, 'actividad-nombre', 'Kung Fu');
    completar(fixture, 'actividad-ubicacion', 'Salón 2');
    completar(fixture, 'actividad-importe', '15000');
    completar(fixture, 'actividad-dias-vencimiento', '45');
    completarHorario(fixture, 0, { dia: 'LUNES', inicio: '12:00', fin: '13:30', cupo: '20' });
    const componente = fixture.componentInstance as unknown as {
      actualizarModoVencimiento(valor: string): void;
      diaVencimientoFijo: { set(valor: string): void };
    };
    componente.actualizarModoVencimiento('DIA_FIJO');
    componente.diaVencimientoFijo.set('10');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#actividad-dias-vencimiento')).toBeNull();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ diaVencimientoFijo: 10 });
    expect(payloads[0]).not.toHaveProperty('diasVencimientoCuota');
  });

  it('no ofrece día fijo con cuotas semanales', () => {
    const fixture = crear();
    const componente = fixture.componentInstance as unknown as {
      actualizarModoVencimiento(valor: string): void;
      actualizarPeriodicidad(valor: string): void;
    };
    componente.actualizarModoVencimiento('DIA_FIJO');
    componente.actualizarPeriodicidad('SEMANAL');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.formulario-actividad__modo-vencimiento')).toBeNull();
    expect(fixture.nativeElement.querySelector('#actividad-dias-vencimiento')).not.toBeNull();
  });
});
