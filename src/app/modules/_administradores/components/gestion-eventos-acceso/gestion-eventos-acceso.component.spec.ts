import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionEventosAccesoComponent } from './gestion-eventos-acceso.component';

describe('GestionEventosAccesoComponent', () => {
  const evento = {
    uuid: 'evento-1',
    titulo: 'Cena',
    descripcion: 'Entrada general',
    monto: 2500,
    permiteMorosos: true,
    permiteInvitados: true,
    montoMorosos: 3000,
    montoInvitados: 4000,
  };
  const pagina = {
    content: [evento],
    totalElements: 1,
    totalPages: 1,
    size: 10,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 1,
    empty: false,
  };
  const paginar = vi.fn(() => of(pagina));
  const obtenerDetalle = vi.fn(() => of(evento));
  const crear = vi.fn(() => of(evento));
  const eliminar = vi.fn(() => of(undefined));
  const toastError = vi.fn();
  const confirmDanger = vi.fn(() => Promise.resolve(false));

  beforeEach(() => {
    paginar.mockClear();
    obtenerDetalle.mockClear();
    crear.mockClear();
    eliminar.mockClear();
    toastError.mockClear();
    confirmDanger.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    TestBed.configureTestingModule({
      imports: [GestionEventosAccesoComponent],
      providers: [
        {
          provide: EventosAccesoApiService,
          useValue: {
            paginar,
            obtenerDetalle,
            crear,
            actualizar: vi.fn(() => of(evento)),
            eliminar,
            escanear: vi.fn(),
            cobrar: vi.fn(),
            paginarHistorial: vi.fn(),
          },
        },
        {
          provide: ToastAlertService,
          useValue: { error: toastError, confirmDanger },
        },
      ],
    });
  });

  it('pagina desde uno con tamaño diez y búsqueda', async () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(paginar).toHaveBeenCalledWith(
      { page: 1, size: 10, search: '' },
      { mostrarToastError: false },
    );
  });

  it('abre el detalle con el evento actualizado', () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.manejarAccion({ accion: 'ver', fila: evento });

    expect(obtenerDetalle).toHaveBeenCalledWith('evento-1', { mostrarToastError: false });
    expect(componente.eventoSeleccionado()).toEqual(evento);
    expect(componente.popupDetalleAbierto()).toBe(true);
  });

  it('mantiene el popup cerrado y muestra la carga en la acción hasta recibir el detalle', () => {
    const detallePendiente = new Subject<typeof evento>();
    obtenerDetalle.mockReturnValueOnce(detallePendiente.asObservable());
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.manejarAccion({ accion: 'ver', fila: evento });

    expect(componente.popupDetalleAbierto()).toBe(false);
    expect(componente.detalleCargando()).toBe(true);
    expect(componente.acciones[0].cargando(evento)).toBe(true);

    detallePendiente.next(evento);
    detallePendiente.complete();

    expect(componente.popupDetalleAbierto()).toBe(true);
    expect(componente.detalleCargando()).toBe(false);
  });

  it('obtiene el detalle antes de editar', () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.manejarAccion({ accion: 'editar', fila: evento });

    expect(obtenerDetalle).toHaveBeenCalledWith('evento-1', { mostrarToastError: false });
    expect(componente.eventoSeleccionado()).toEqual(evento);
    expect(componente.popupFormularioAbierto()).toBe(true);
  });

  it('muestra el error de guardado mediante toast y no dentro del formulario', () => {
    crear.mockReturnValueOnce(
      throwError(() => new Error('fallo de prueba')),
    );
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.abrirAlta();
    componente.guardar({
      titulo: 'Cena',
      descripcion: 'Entrada general',
      fecha: '2026-09-03T00:00',
      monto: 0,
      montoMorosos: 100,
      montoInvitados: 100,
      permiteMorosos: true,
      permiteInvitados: true,
    });

    expect(toastError).toHaveBeenCalledWith(
      'No se pudo guardar el evento. Corregí el problema y reintentá; los datos se conservaron.',
      { titulo: 'Eventos de acceso' },
    );
    expect(componente.errorPopup()).toBe('');
  });

  it('abre la operación de ingreso con el detalle actualizado', () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.manejarAccion({ accion: 'ingresar', fila: evento });

    expect(obtenerDetalle).toHaveBeenCalledWith('evento-1', { mostrarToastError: false });
    expect(componente.popupOperacionAbierto()).toBe(true);
  });

  it('bloquea ingreso y edición de eventos anteriores a hoy', () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const eventoAnterior = {
      ...evento,
      fecha: [ayer.getFullYear(), ayer.getMonth() + 1, ayer.getDate()],
    };

    expect(componente.acciones[1].deshabilitada(eventoAnterior)).toBe(true);
    expect(componente.acciones[2].deshabilitada(eventoAnterior)).toBe(true);

    componente.manejarAccion({ accion: 'ingresar', fila: eventoAnterior });
    componente.manejarAccion({ accion: 'editar', fila: eventoAnterior });

    expect(obtenerDetalle).not.toHaveBeenCalled();
  });

  it('abre el historial con el evento seleccionado', () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;

    componente.manejarAccion({ accion: 'historial', fila: evento });

    expect(componente.eventoSeleccionado()).toEqual(evento);
    expect(componente.popupHistorialAbierto()).toBe(true);
    expect(obtenerDetalle).not.toHaveBeenCalled();
  });

  it('requiere confirmación explícita para la baja lógica', async () => {
    const fixture = TestBed.createComponent(GestionEventosAccesoComponent);
    const componente = fixture.componentInstance as any;
    await componente.abrirEliminar(evento);
    expect(eliminar).not.toHaveBeenCalled();

    confirmDanger.mockResolvedValueOnce(true);
    await componente.abrirEliminar(evento);
    expect(eliminar).toHaveBeenCalledWith('evento-1', {
      mostrarToastError: false,
    });
  });
});
