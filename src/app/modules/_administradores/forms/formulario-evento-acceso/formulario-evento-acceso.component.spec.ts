import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { FormularioEventoAccesoComponent } from './formulario-evento-acceso.component';

describe('FormularioEventoAccesoComponent', () => {
  it('envía monto uno cuando los permisos están deshabilitados', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    const componente = fixture.componentInstance as any;
    const enviado = vi.fn();
    fixture.componentInstance.enviado.subscribe(enviado);

    componente.titulo.set('  Cena aniversario  ');
    componente.descripcion.set('  Entrada general  ');
    componente.monto.set(2500);
    componente.montoMorosos.set(3500);
    componente.montoInvitados.set(5000);
    componente.fecha.set('2026-09-03');
    componente.permiteMorosos.set(false);
    componente.permiteInvitados.set(false);
    componente.enviar();

    expect(enviado).toHaveBeenCalledWith({
      titulo: 'Cena aniversario',
      descripcion: 'Entrada general',
      monto: 2500,
      montoMorosos: 1,
      montoInvitados: 1,
      permiteMorosos: false,
      permiteInvitados: false,
      fecha: '2026-09-03T00:00',
    });
  });

  it.each([
    ['montoMorosos', -1],
    ['montoInvitados', Number.NaN],
  ])('no emite cuando %s no es mayor a cero', (campo, valor) => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    const componente = fixture.componentInstance as any;
    const enviado = vi.fn();
    fixture.componentInstance.enviado.subscribe(enviado);
    componente.titulo.set('Evento');
    componente.descripcion.set('Descripción');
    componente.monto.set(100);
    componente.montoMorosos.set(100);
    componente.montoInvitados.set(100);
    componente[campo].set(valor);

    componente.enviar();

    expect(enviado).not.toHaveBeenCalled();
  });

  it('permite cero para el precio de socio al día', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    const componente = fixture.componentInstance as any;
    const enviado = vi.fn();
    fixture.componentInstance.enviado.subscribe(enviado);
    componente.titulo.set('Evento gratuito');
    componente.descripcion.set('Acceso sin cargo');
    componente.monto.set(0);
    componente.montoMorosos.set(100);
    componente.montoInvitados.set(100);
    componente.fecha.set('2026-09-03');

    componente.enviar();

    expect(enviado).toHaveBeenCalledWith({
      titulo: 'Evento gratuito',
      descripcion: 'Acceso sin cargo',
      monto: 0,
      montoMorosos: 100,
      montoInvitados: 100,
      permiteMorosos: true,
      permiteInvitados: true,
      fecha: '2026-09-03T00:00',
    });
  });

  it('marca en rojo los importes inválidos luego de intentar enviar', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;
    componente.titulo.set('Evento');
    componente.descripcion.set('Descripción');
    componente.monto.set(0);
    componente.montoMorosos.set(0);
    componente.montoInvitados.set(100);
    componente.enviar();
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('#evento-acceso-monto')
        ?.getAttribute('data-app-invalido'),
    ).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('#evento-acceso-monto-morosos')
        ?.getAttribute('data-app-invalido'),
    ).toBe('true');
  });

  it('envía la fecha seleccionada con la hora requerida por el backend', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    const componente = fixture.componentInstance as any;
    const enviado = vi.fn();
    fixture.componentInstance.enviado.subscribe(enviado);
    componente.titulo.set('Evento');
    componente.descripcion.set('Descripción');
    componente.monto.set(0);
    componente.montoMorosos.set(100);
    componente.montoInvitados.set(100);
    componente.fecha.set('2026-09-03');

    componente.enviar();

    expect(enviado).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: '2026-09-03T00:00' }),
    );
  });

  it('precarga edición y conserva permisos false', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    fixture.componentRef.setInput('valorInicial', {
      uuid: 'evento-1',
      titulo: 'Torneo',
      descripcion: 'Final',
      fecha: '02/09/2026',
      monto: 1000,
      montoMorosos: 2000,
      montoInvitados: 3000,
      permiteMorosos: false,
      permiteInvitados: false,
    });
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;

    expect(componente.titulo()).toBe('Torneo');
    expect(componente.fecha()).toBe('2026-09-02');
    expect(componente.montoMorosos()).toBe(2000);
    expect(componente.montoInvitados()).toBe(3000);
    expect(componente.permiteMorosos()).toBe(false);
    expect(componente.permiteInvitados()).toBe(false);
  });

  it('renderiza el selector como fecha y no como fecha-hora', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'app-input-fecha .input-fecha__calendario-nativo',
    );

    expect(input?.type).toBe('date');
  });

  it('inicia ambos permisos habilitados en un alta', () => {
    const fixture = TestBed.createComponent(FormularioEventoAccesoComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;

    expect(componente.permiteMorosos()).toBe(true);
    expect(componente.permiteInvitados()).toBe(true);
  });
});
