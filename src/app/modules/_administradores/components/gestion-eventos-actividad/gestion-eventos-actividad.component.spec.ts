import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ActividadPaginateDto,
  EventoActividadDto,
  PaginaActividadesResponse,
  PaginaEventosActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { EventosActividadApiService } from '../../../../core/api/services/eventos-actividad-api.service';
import { SelectComponent } from '../../../ui/select/select.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionEventosActividadComponent } from './gestion-eventos-actividad.component';

describe('GestionEventosActividadComponent', () => {
  const paginaEventos: PaginaEventosActividadDto = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    size: 5,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };
  const actividad: ActividadPaginateDto = {
    actividadUuid: 'actividad-1',
    nombre: 'Yoga',
    ubicacion: 'Sala 1',
    cupoMaximo: 20,
    diasSemana: 'LUNES',
    horaInicio: '18:00:00',
    horaFin: '19:00:00',
    importeCuota: 1000,
    completa: false,
    categoriaNombre: 'Bienestar',
    cantidadInscriptos: 4,
  };
  const paginaActividades: PaginaActividadesResponse = {
    content: [actividad],
    totalElements: 1,
    totalPages: 1,
    size: 1000,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 1,
    empty: false,
  };
  const paginarEventos = vi.fn(() => of(paginaEventos));
  const paginarActividades = vi.fn(() => of(paginaActividades));
  const cancelarEvento = vi.fn(() => of({}));
  const cambiarEstadoEvento = vi.fn(() => of({}));
  const actualizarEvento = vi.fn(() => of({}));
  const eliminarEvento = vi.fn(() => of(undefined));
  const toastAlert = {
    confirm: vi.fn(() => Promise.resolve(true)),
    confirmDanger: vi.fn(() => Promise.resolve(true)),
  };
  const eventoConfirmado: EventoActividadDto = {
    uuid: 'evento-1',
    actividadUuid: 'actividad-1',
    actividadNombre: 'Yoga',
    titulo: 'Clase especial',
    descripcion: 'Práctica',
    ubicacion: 'Sala 1',
    inicio: '24/07/2026 13:16:00',
    fin: '24/07/2026 14:16:00',
    estado: 'CONFIRMADO',
  };

  beforeEach(() => {
    paginarEventos.mockClear();
    paginarEventos.mockReturnValue(of(paginaEventos));
    paginarActividades.mockClear();
    paginarActividades.mockReturnValue(of(paginaActividades));
    cancelarEvento.mockClear();
    cambiarEstadoEvento.mockClear();
    actualizarEvento.mockClear();
    eliminarEvento.mockClear();
    toastAlert.confirm.mockClear();
    toastAlert.confirmDanger.mockClear();

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

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GestionEventosActividadComponent],
      providers: [
        {
          provide: EventosActividadApiService,
          useValue: {
            paginar: paginarEventos,
            crear: vi.fn(),
            actualizar: actualizarEvento,
            cambiarEstado: cambiarEstadoEvento,
            cancelar: cancelarEvento,
            eliminar: eliminarEvento,
          },
        },
        { provide: ActividadesApiService, useValue: { paginar: paginarActividades } },
        { provide: ToastAlertService, useValue: toastAlert },
      ],
    });
  });

  it('muestra el selector de actividad y pagina por actividad al cambiarlo', async () => {
    const fixture = TestBed.createComponent(GestionEventosActividadComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    expect(select.etiqueta()).toBe('Actividad');
    expect(select.opciones()).toContainEqual({ value: '', label: 'Todas las actividades' });
    expect(select.opciones()).toContainEqual({ value: 'actividad-1', label: 'Yoga · Sala 1' });

    select.valueChange.emit('actividad-1');

    expect(paginarEventos).toHaveBeenLastCalledWith({
      page: 1,
      size: 5,
      search: '',
      actividadUuid: 'actividad-1',
    });
  });

  it('muestra cancelar para confirmados y confirmar para cancelados', () => {
    const fixture = TestBed.createComponent(GestionEventosActividadComponent);
    const acciones = (fixture.componentInstance as any).acciones;
    const cancelar = acciones.find((accion: { id: string }) => accion.id === 'cancelar');
    const confirmar = acciones.find((accion: { id: string }) => accion.id === 'confirmar');

    expect(cancelar.visible(eventoConfirmado)).toBe(true);
    expect(confirmar.visible(eventoConfirmado)).toBe(false);
    expect(cancelar.visible({ ...eventoConfirmado, estado: 'CANCELADO' })).toBe(false);
    expect(confirmar.visible({ ...eventoConfirmado, estado: 'CANCELADO' })).toBe(true);
  });

  it('incluye la descripción entre las columnas de la tabla', () => {
    const fixture = TestBed.createComponent(GestionEventosActividadComponent);
    const columnas = (fixture.componentInstance as any).columnas;

    expect(columnas).toContainEqual(
      expect.objectContaining({ id: 'descripcion', titulo: 'Descripción' }),
    );
  });

  it('confirma un evento cancelado mediante su cambio de estado', async () => {
    const fixture = TestBed.createComponent(GestionEventosActividadComponent);
    fixture.detectChanges();
    await (fixture.componentInstance as any).confirmar({
      ...eventoConfirmado,
      estado: 'CANCELADO',
    });

    expect(toastAlert.confirm).toHaveBeenCalled();
    expect(cambiarEstadoEvento).toHaveBeenCalledWith('evento-1', 'CONFIRMADO');
  });

  it('pide confirmación danger antes de cancelar o eliminar', async () => {
    const fixture = TestBed.createComponent(GestionEventosActividadComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as any).cancelar(eventoConfirmado);
    await (fixture.componentInstance as any).eliminar(eventoConfirmado);

    expect(cancelarEvento).toHaveBeenCalledWith('evento-1');
    expect(eliminarEvento).toHaveBeenCalledWith('evento-1');
    expect(toastAlert.confirmDanger).toHaveBeenCalledTimes(2);
  });
});
