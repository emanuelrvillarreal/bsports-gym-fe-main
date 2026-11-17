import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AsistenciaProfesorItemDto,
  EventoActividadDto,
  PlanillaAsistenciaProfesorDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { CalendarioSlotDto } from '../../../../core/api/interfaces/portal.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { SelectComponent } from '../../../ui/select/select.component';
import { TablaResponsiveComponent } from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { WizardAsistenciaEventoProfesorComponent } from './wizard-asistencia-evento-profesor.component';

describe('WizardAsistenciaEventoProfesorComponent', () => {
  const evento: EventoActividadDto = {
    uuid: 'evento-1',
    actividadUuid: 'actividad-1',
    actividadNombre: 'Yoga',
    titulo: 'Encuentro de invierno',
    descripcion: '',
    ubicacion: 'Salón principal',
    inicio: '25/07/2026 11:25:00',
    fin: '07/08/2026 11:25:00',
    estado: 'CONFIRMADO',
  };
  const slotActivo: CalendarioSlotDto = {
    slotUuid: 'slot-activo',
    eventoUuid: null,
    titulo: null,
    ubicacion: null,
    tipo: 'ACTIVIDAD' as const,
    referenciaUuid: 'actividad-1',
    referenciaNombre: 'Yoga',
    titularNombre: null,
    titularApellido: null,
    inicio: '03/08/2026 10:00:00',
    fin: '03/08/2026 11:31:00',
    estado: 'CONFIRMADO' as const,
  };
  const slotCancelado: CalendarioSlotDto = {
    ...slotActivo,
    slotUuid: 'slot-cancelado',
    inicio: '01/08/2026 10:00:00',
    fin: '01/08/2026 11:31:00',
    estado: 'CANCELADO' as const,
  };
  const itemsPlanilla: readonly AsistenciaProfesorItemDto[] = [
    { memberUuid: 'member-1', nombre: 'Ana', apellido: 'Pérez', estado: null },
    {
      memberUuid: 'member-2',
      nombre: 'Luis',
      apellido: 'Gómez',
      estado: 'PRESENTE' as const,
    },
  ];
  const respuestaPlanilla: PlanillaAsistenciaProfesorDto = {
    slotUuid: 'slot-activo',
    actividadUuid: 'actividad-1',
    actividadNombre: 'Yoga',
    fecha: '03/08/2026',
    inicio: '03/08/2026 10:00:00',
    fin: '03/08/2026 11:31:00',
    alumnos: [],
  };

  const consultarCalendario = vi.fn<PortalProfesorApiService['consultarCalendario']>(() =>
    of([slotActivo]),
  );
  const obtenerPlanillaAsistencia = vi.fn<PortalProfesorApiService['obtenerPlanillaAsistencia']>(
    () => of(itemsPlanilla),
  );
  const guardarAsistencia = vi.fn<PortalProfesorApiService['guardarAsistencia']>(() =>
    of(respuestaPlanilla),
  );
  const confirmarDescarte = vi.fn(() => Promise.resolve(true));

  beforeEach(async () => {
    consultarCalendario.mockReset();
    obtenerPlanillaAsistencia.mockReset();
    guardarAsistencia.mockReset();
    confirmarDescarte.mockReset();
    consultarCalendario.mockReturnValue(of([slotActivo]));
    obtenerPlanillaAsistencia.mockReturnValue(of(itemsPlanilla));
    guardarAsistencia.mockReturnValue(of(respuestaPlanilla));
    confirmarDescarte.mockResolvedValue(true);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
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

    await TestBed.configureTestingModule({
      imports: [WizardAsistenciaEventoProfesorComponent],
      providers: [
        {
          provide: PortalProfesorApiService,
          useValue: { consultarCalendario, obtenerPlanillaAsistencia, guardarAsistencia },
        },
        {
          provide: ToastAlertService,
          useValue: { confirm: confirmarDescarte },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'dark' | 'light'>('light') },
        },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#009fe3'),
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();
  });

  const crearFixture = (): ComponentFixture<WizardAsistenciaEventoProfesorComponent> => {
    const fixture = TestBed.createComponent(WizardAsistenciaEventoProfesorComponent);
    fixture.componentRef.setInput('evento', evento);
    fixture.detectChanges();
    return fixture;
  };

  const cargarPlanilla = (
    fixture: ComponentFixture<WizardAsistenciaEventoProfesorComponent>,
  ): any => {
    const componente = fixture.componentInstance as any;
    componente.seleccionarDia('slot-activo');
    componente.avanzar();
    fixture.detectChanges();
    return componente;
  };

  it('consulta el rango del evento y filtra, deduplica y ordena los días de la actividad', () => {
    consultarCalendario.mockReturnValue(
      of([
        slotActivo,
        slotCancelado,
        { ...slotActivo },
        { ...slotActivo, slotUuid: 'amenity-1', tipo: 'AMENITY' as const },
        { ...slotActivo, slotUuid: 'otra-actividad', referenciaUuid: 'actividad-2' },
        { ...slotActivo, slotUuid: 'fuera-del-inicio', inicio: '24/07/2026 10:00:00' },
        { ...slotActivo, slotUuid: 'fuera-del-fin', inicio: '08/08/2026 10:00:00' },
        { ...slotActivo, slotUuid: null },
      ]),
    );

    const fixture = crearFixture();
    const componente = fixture.componentInstance as any;

    expect(consultarCalendario).toHaveBeenCalledWith({
      desde: '24/07/2026',
      hasta: '08/08/2026',
    });
    expect(componente.dias().map((dia: { slotUuid: string }) => dia.slotUuid)).toEqual([
      'slot-cancelado',
      'slot-activo',
    ]);
    expect(componente.opcionesDias()).toEqual([
      expect.objectContaining({ value: 'slot-cancelado', disabled: true }),
      expect.objectContaining({ value: 'slot-activo', disabled: false }),
    ]);
  });

  it('incluye un evento de un solo día sin devolver slots de los días vecinos', () => {
    const eventoDeUnDia = {
      ...evento,
      inicio: '22/08/2026 10:00:00',
      fin: '22/08/2026 11:00:00',
    };
    consultarCalendario.mockReturnValue(
      of([
        { ...slotActivo, slotUuid: 'dia-anterior', inicio: '21/08/2026 10:00:00' },
        { ...slotActivo, slotUuid: 'dia-del-evento', inicio: '22/08/2026 10:00:00' },
        { ...slotActivo, slotUuid: 'dia-siguiente', inicio: '23/08/2026 10:00:00' },
      ]),
    );

    const fixture = TestBed.createComponent(WizardAsistenciaEventoProfesorComponent);
    fixture.componentRef.setInput('evento', eventoDeUnDia);
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;

    expect(consultarCalendario).toHaveBeenCalledWith({
      desde: '21/08/2026',
      hasta: '23/08/2026',
    });
    expect(componente.dias().map((dia: { slotUuid: string }) => dia.slotUuid)).toEqual([
      'dia-del-evento',
    ]);
  });

  it('usa el título hero, limita el select a cinco opciones y no fuerza altura completa', () => {
    const fixture = crearFixture();
    const hero = fixture.debugElement.query(By.directive(TituloHeroComponent))
      .componentInstance as TituloHeroComponent;
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    const popup = fixture.nativeElement.querySelector('.popup') as HTMLElement;

    expect(hero.titulo()).toBe('Asistencia · Encuentro de invierno');
    expect(select.maximoOpcionesVisibles()).toBe(5);
    expect(popup.classList.contains('popup--alto-completo')).toBe(false);
  });

  it('carga la planilla al avanzar y configura cinco filas visibles', () => {
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);

    expect(obtenerPlanillaAsistencia).toHaveBeenCalledWith('slot-activo');
    expect(componente.pasoActual()).toBe('asistencia');
    expect(componente.planillaBorrador()).toEqual(itemsPlanilla);

    const tabla = fixture.debugElement.query(By.directive(TablaResponsiveComponent))
      .componentInstance as TablaResponsiveComponent;
    expect(tabla.tbodyRows()).toBe(5);
    expect(tabla.mostrarAcciones()).toBe(true);
    expect(componente.columnasAsistencia[2].estadoTexto(null)).toBe('No informado');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.tabla-responsive__estado')
        ?.textContent,
    ).toContain('No informado');
  });

  it('mantiene el borrador local y muestra solo presentes sin acciones al confirmar', () => {
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);
    const fila = componente.planillaBorrador()[0];

    componente.manejarAccionAsistencia({ accion: 'presente', fila });
    componente.avanzar();
    fixture.detectChanges();

    expect(guardarAsistencia).not.toHaveBeenCalled();
    expect(componente.pasoActual()).toBe('confirmacion');
    expect(componente.presentes().map((item: { memberUuid: string }) => item.memberUuid)).toEqual([
      'member-1',
      'member-2',
    ]);

    const tabla = fixture.debugElement.query(By.directive(TablaResponsiveComponent))
      .componentInstance as TablaResponsiveComponent;
    expect(tabla.mostrarAcciones()).toBe(false);
    expect(tabla.tbodyRows()).toBe(5);
  });

  it('guarda una sola vez y envía únicamente estados no nulos modificados', () => {
    const respuesta$ = new Subject<PlanillaAsistenciaProfesorDto>();
    guardarAsistencia.mockReturnValue(respuesta$);
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    componente.manejarAccionAsistencia({
      accion: 'presente',
      fila: componente.planillaBorrador()[0],
    });
    componente.avanzar();
    componente.confirmar();
    componente.confirmar();

    expect(guardarAsistencia).toHaveBeenCalledTimes(1);
    expect(guardarAsistencia).toHaveBeenCalledWith('slot-activo', {
      items: [{ memberUuid: 'member-1', estado: 'PRESENTE' }],
    });
    expect(cierres).toBe(0);

    respuesta$.next(respuestaPlanilla);
    respuesta$.complete();

    expect(cierres).toBe(1);
  });

  it('cierra sin PUT cuando no hay cambios', () => {
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    componente.avanzar();
    componente.confirmar();

    expect(guardarAsistencia).not.toHaveBeenCalled();
    expect(cierres).toBe(1);
  });

  it('conserva el paso y el borrador cuando falla el guardado', () => {
    guardarAsistencia.mockReturnValue(throwError(() => new Error('fallo')));
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);

    componente.manejarAccionAsistencia({
      accion: 'ausente',
      fila: componente.planillaBorrador()[1],
    });
    componente.avanzar();
    componente.confirmar();

    expect(componente.pasoActual()).toBe('confirmacion');
    expect(componente.planillaBorrador()[1].estado).toBe('AUSENTE');
    expect(componente.errorGuardado()).toContain('No se pudo guardar');
  });

  it('pide confirmación al cerrar con cambios y cancela lecturas al cerrar', async () => {
    const fixture = crearFixture();
    const componente = cargarPlanilla(fixture);
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);
    componente.manejarAccionAsistencia({
      accion: 'presente',
      fila: componente.planillaBorrador()[0],
    });
    confirmarDescarte.mockResolvedValueOnce(false);

    componente.solicitarCierre();
    await Promise.resolve();

    expect(confirmarDescarte).toHaveBeenCalled();
    expect(cierres).toBe(0);

    confirmarDescarte.mockResolvedValueOnce(true);
    componente.solicitarCierre();
    await Promise.resolve();
    expect(cierres).toBe(1);
  });

  it('cancela la consulta de calendario activa al cerrar', () => {
    const calendario$ = new Subject<readonly CalendarioSlotDto[]>();
    consultarCalendario.mockReturnValue(calendario$);
    const fixture = crearFixture();
    const componente = fixture.componentInstance as any;
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    expect(calendario$.observed).toBe(true);
    componente.solicitarCierre();

    expect(calendario$.observed).toBe(false);
    expect(cierres).toBe(1);
  });
});
