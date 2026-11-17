import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventoActividadDto } from '../../../../core/api/interfaces/actividades.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { EventosActividadApiService } from '../../../../core/api/services/eventos-actividad-api.service';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { TablaResponsiveComponent } from '../../../ui/tabla-responsive/tabla-responsive.component';
import { GestionEventosProfesorComponent } from './gestion-eventos-profesor.component';

describe('GestionEventosProfesorComponent', () => {
  const actividadDetalle = {
    actividadUuid: 'actividad-1',
    nombre: 'Yoga',
    ubicacion: 'Salón principal',
    cupoMaximo: 10,
    diasSemana: 'LUNES;MARTES',
    horaInicio: '10:00:00',
    horaFin: '11:00:00',
    importeCuota: 0,
    completa: false,
    profesores: [],
    categoria: null,
    inscriptos: [
      {
        userUuid: 'user-1',
        titularMemberUuid: null,
        nombre: 'Leonel',
        apellido: 'Messi',
        imageUrl: 'https://example.com/leonel.jpg',
        email: 'usuario@test.com',
        dni: '004316606',
        fechaNacimiento: '27/07/2026',
      },
    ],
  };
  const eventoDetalle: EventoActividadDto = {
    uuid: 'evento-1',
    actividadUuid: 'actividad-1',
    actividadNombre: 'Yoga',
    titulo: 'Clase especial',
    descripcion: 'Clase de recuperación',
    ubicacion: 'Salón principal',
    inicio: '15/08/2026 10:00:00',
    fin: '16/08/2026 11:00:00',
    estado: 'CONFIRMADO' as const,
  };
  const actividadFila = {
    actividadUuid: 'actividad-1',
    nombre: 'Yoga',
    ubicacion: 'SalÃ³n principal',
    cupoMaximo: 10,
    diasSemana: 'LUNES;MARTES',
    horaInicio: '10:00:00',
    horaFin: '11:00:00',
    importeCuota: 0,
    completa: false,
    cantidadInscriptos: 1,
  };
  const eliminarEvento = vi.fn(() => of(undefined));
  const confirmDanger = vi.fn(() => Promise.resolve(true));
  const obtenerDetalle = vi.fn(() => of(actividadDetalle));
  const obtenerEvento = vi.fn(() => of(eventoDetalle));
  const paginarAsistencias = vi.fn(() =>
    of({
      content: [
        {
          asistenciaUuid: 'asistencia-1',
          slotUuid: 'slot-1',
          actividadUuid: 'actividad-1',
          actividadNombre: 'Yoga',
          memberUuid: 'member-1',
          memberNombre: 'Ana PÃ©rez',
          fecha: '01/09/2026',
          presente: true,
        },
      ],
      totalPages: 2,
    }),
  );
  beforeEach(() => {
    eliminarEvento.mockClear();
    confirmDanger.mockClear();
    obtenerDetalle.mockClear();
    obtenerEvento.mockClear();
    paginarAsistencias.mockClear();
    obtenerDetalle.mockReturnValue(of(actividadDetalle));
    obtenerEvento.mockReturnValue(of(eventoDetalle));
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
    TestBed.configureTestingModule({
      imports: [GestionEventosProfesorComponent],
      providers: [
        {
          provide: ActividadesApiService,
          useValue: {
            paginar: vi.fn(() => of({ content: [], totalPages: 1 })),
            obtenerDetalle,
          },
        },
        {
          provide: EventosActividadApiService,
          useValue: { paginar: vi.fn(() => of({ content: [], totalPages: 1 })) },
        },
        {
          provide: PortalProfesorApiService,
          useValue: {
            crearEvento: vi.fn(),
            actualizarEvento: vi.fn(),
            obtenerEvento,
            eliminarEvento,
            paginarAsistencias,
          },
        },
        {
          provide: ToastAlertService,
          useValue: { confirmDanger, error: vi.fn() },
        },
      ],
    });
  });

  it('abre el alta sin exigir una actividad seleccionada en los filtros', () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    (fixture.componentInstance as any).abrirAlta();
    expect((fixture.componentInstance as any).popupFormularioAbierto()).toBe(true);
  });

  it('separa las tablas de eventos y actividades', () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-tabla-responsive')).toHaveLength(2);
    expect(component.accionesEventos.map((accion: { id: string }) => accion.id)).toEqual([
      'ver-evento',
      'editar',
      'dar-baja',
    ]);
    expect(component.accionesActividades.map((accion: { id: string }) => accion.id)).toEqual([
      'ver-actividad',
    ]);
  });
    /*
    expect(paginarAsistencias).toHaveBeenLastCalledWith({
      page: 1,
      size: 5,
      actividadUuid: 'actividad-1',
    });
    expect(component.asistencias()[0]).toMatchObject({
      filaUuid: 'asistencia-1',
      estado: 'PRESENTE',
      memberNombre: 'Ana PÃ©rez',
    });
    expect(component.totalPaginasAsistencias()).toBe(2);

    component.cambiarPaginaAsistencias(2);

    expect(paginarAsistencias).toHaveBeenLastCalledWith({
      page: 2,
      size: 5,
      actividadUuid: 'actividad-1',
    });
  });

    */
  it('confirma la baja y usa el endpoint del portal', async () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const evento = { uuid: 'evento-1', titulo: 'Clase especial' };

    await (fixture.componentInstance as any).darDeBaja(evento);

    expect(confirmDanger).toHaveBeenCalled();
    expect(eliminarEvento).toHaveBeenCalledWith('evento-1');
  });

  it('normaliza días, calcula cupo y prioriza userUuid para los inscriptos', () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;
    component.actividadDetalle.set(actividadDetalle);

    expect(component.diasHabituales()).toEqual(['Lunes', 'Martes']);
    expect(component.filasInscriptosActividad()[0]).toMatchObject({
      inscriptoUuid: 'user-1',
      nombre: 'Leonel',
      dni: '004316606',
      fechaNacimiento: '27/07/2026',
    });
    expect(component.cupoCompleto()).toBe(false);

    component.actividadDetalle.set({
      ...actividadDetalle,
      cupoMaximo: 1,
      diasSemana: 'DOMINGO;LUNES;MARTES;MIERCOLES;JUEVES;VIERNES;SABADO',
    });
    expect(component.diasHabituales()).toEqual(['Todos los días']);
    expect(component.cupoCompleto()).toBe(true);
  });

  it.each([
    ['CONFIRMADO', 'Confirmado', 'detalle-actividad__chip--exito'],
    ['PENDIENTE', 'Pendiente', 'detalle-actividad__chip--advertencia'],
    ['CANCELADO', 'Cancelado', 'detalle-actividad__chip--peligro'],
  ])('presenta el estado %s con su variante semántica', (estado, texto, clase) => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;
    component.eventoDetalle.set({ ...eventoDetalle, estado });

    expect(component.textoEstadoEvento()).toBe(texto);
    expect(component.claseEstadoEvento()).toBe(clase);
  });

  it('carga el detalle y los alumnos desde la actividad asociada al evento', () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;

    component.verEvento(eventoDetalle);

    expect(obtenerEvento).toHaveBeenCalledWith('evento-1');
    expect(obtenerDetalle).toHaveBeenCalledWith('actividad-1');
    expect(component.eventoDetalle()?.titulo).toBe('Clase especial');
    expect(component.actividadDetalle()).toBeNull();
    expect(component.participantesEvento()).toHaveLength(1);
    expect(component.participantesEvento()[0]).toMatchObject({
      inscriptoUuid: 'user-1',
      nombre: 'Leonel',
    });
    expect(component.procesandoDetalle()).toBeNull();
  });

  it('conserva el detalle del evento si falla la carga de sus alumnos', () => {
    obtenerDetalle.mockReturnValueOnce(throwError(() => new Error('Actividad no disponible')));
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;

    component.verEvento(eventoDetalle);

    expect(component.eventoDetalle()?.titulo).toBe('Clase especial');
    expect(component.participantesEvento()).toEqual([]);
    expect(component.errorParticipantesEvento()).toBe(
      'No se pudieron cargar los alumnos de la actividad asociada al evento.',
    );
  });

  it('cancela una carga anterior al abrir el detalle de otro evento', () => {
    const eventoTardio$ = new Subject<EventoActividadDto>();
    obtenerEvento.mockReturnValueOnce(eventoTardio$);
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;

    component.verEvento({ ...eventoDetalle, uuid: 'evento-anterior' });
    component.verEvento(eventoDetalle);
    eventoTardio$.next({ ...eventoDetalle, uuid: 'evento-anterior' });
    eventoTardio$.complete();
    expect(component.eventoDetalle().uuid).toBe('evento-1');
    expect(component.actividadDetalle()).toBeNull();
  });

  it('renderiza solo los datos y alumnos de la actividad elegida', () => {
    const fixture = TestBed.createComponent(GestionEventosProfesorComponent);
    const component = fixture.componentInstance as any;

    component.verActividad(actividadFila);
    fixture.detectChanges();

    const detalle = fixture.nativeElement.querySelector('.detalle-actividad') as HTMLElement;
    expect(detalle.querySelector('app-titulo-hero')).toBeTruthy();
    expect(detalle.textContent).toContain('Datos habituales de la actividad');
    expect(detalle.textContent).toContain('Lunes');
    expect(detalle.textContent).toContain('1/10');
    expect(detalle.querySelector('.detalle-actividad__chip--exito')).toBeTruthy();
    expect(detalle.textContent).toContain('Alumnos de la actividad');
    expect(detalle.querySelectorAll('app-tabla-responsive')).toHaveLength(1);
    expect(detalle.textContent).not.toContain('Planilla de asistencia');
    const tablaDetalle = fixture.debugElement
      .queryAll(By.directive(TablaResponsiveComponent))
      .at(-1)?.componentInstance as TablaResponsiveComponent;
    expect(tablaDetalle.tbodyRows()).toBe(5);
    expect(tablaDetalle.mostrarAcciones()).toBe(false);
    const iconos = detalle.querySelectorAll('ng-icon[name="heroClock"]');
    expect(iconos).toHaveLength(1);
    expect([...iconos].every((icono) => icono.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
