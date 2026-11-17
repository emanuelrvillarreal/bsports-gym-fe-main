import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccesoClubLiveEvent,
  AccesoClubDto,
  PresenteClubDto,
} from '../../../../core/api/interfaces/accesos-club.interfaces';
import {
  SocioDto,
  SociosPaginateResponse,
} from '../../../../core/api/interfaces/socios.interfaces';
import { AccesosClubApiService } from '../../../../core/api/services/accesos-club-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { GestionAccesosComponent } from './gestion-accesos.component';

const socio: SocioDto = {
  memberUuid: 'member-1',
  userUuid: 'user-1',
  nombre: 'Brian',
  apellido: 'Sabatini',
  email: 'brian@example.com',
  dni: '27123456',
  estado: 'ACTIVO',
};

const respuestaSocios: SociosPaginateResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 5,
  number: 0,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
};

describe('GestionAccesosComponent', () => {
  const modoTemaResuelto = signal<'dark' | 'light'>('dark');
  const listarPresentes = vi.fn(() => of([] as readonly PresenteClubDto[]));
  const obtenerHistorial = vi.fn(() => of([] as readonly AccesoClubDto[]));
  const registrar = vi.fn(() =>
    of({ userUuid: 'user-1', tipo: 'INGRESO' as const, presente: true } as AccesoClubDto),
  );
  const paginar = vi.fn(() => of(respuestaSocios));
  let eventosLive: Subject<AccesoClubLiveEvent>;

  beforeEach(async () => {
    listarPresentes.mockClear();
    obtenerHistorial.mockClear();
    registrar.mockClear();
    paginar.mockClear();
    modoTemaResuelto.set('dark');
    eventosLive = new Subject<AccesoClubLiveEvent>();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GestionAccesosComponent],
      providers: [
        {
          provide: AccesosClubApiService,
          useValue: {
            listarPresentes,
            obtenerHistorial,
            registrar,
            observarEnVivo: () => eventosLive,
          },
        },
        { provide: SociosApiService, useValue: { paginar } },
        { provide: ThemeModeService, useValue: { resolvedMode: modoTemaResuelto } },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#2563eb'),
            colorSecundario: signal('#ef4444'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();
  });

  it('limita el carrusel a los tres primeros presentes y muestra DNI y hora', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;
    componente.presentes.set([
      {
        userUuid: 'user-1',
        nombre: 'Ana',
        apellido: 'Uno',
        dni: '1',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:31:54',
      },
      {
        userUuid: 'user-2',
        nombre: 'Beto',
        apellido: 'Dos',
        dni: '2',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:32:03',
      },
      {
        userUuid: 'user-3',
        nombre: 'Caro',
        apellido: 'Tres',
        dni: '3',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:33:00',
        imageUrl: 'https://cdn.example.com/caro.jpg',
      },
      {
        userUuid: 'user-4',
        nombre: 'Dani',
        apellido: 'Cuatro',
        dni: '4',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:34:00',
      },
    ] satisfies readonly PresenteClubDto[]);

    fixture.detectChanges();

    expect(componente.ultimosTresIngresos()).toHaveLength(3);
    expect(
      componente.ultimosTresIngresos().map((persona: PresenteClubDto) => persona.userUuid),
    ).toEqual(['user-1', 'user-2', 'user-3']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('DNI 1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('03/08/2026 10:31:54');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AU');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
        '.gestion-accesos__ingreso-avatar--foto img',
      )?.src,
    ).toContain('https://cdn.example.com/caro.jpg');
  });

  it('alterna entre registrar acceso y registrar salida según el snapshot de presentes', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;
    const [ingreso, egreso] = componente.accionesSocios;

    componente.presentes.set([]);
    expect(ingreso.visible(socio)).toBe(true);
    expect(egreso.visible(socio)).toBe(false);

    componente.presentes.set([
      {
        userUuid: 'user-1',
        nombre: 'Brian',
        apellido: 'Sabatini',
        dni: '27123456',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:32:03',
      },
    ] satisfies readonly PresenteClubDto[]);
    expect(ingreso.visible(socio)).toBe(false);
    expect(egreso.visible(socio)).toBe(true);
  });

  it('recarga presentes e historial después de registrar un acceso', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    componente.seleccionarSocio({ accion: 'registrar-ingreso', fila: socio });

    expect(registrar).toHaveBeenCalledWith({ userUuid: 'user-1' });
    expect(listarPresentes).toHaveBeenCalled();
    expect(obtenerHistorial).toHaveBeenCalled();
  });

  it('incorpora eventos live al feed y resincroniza presentes sin mostrar carga', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;
    fixture.detectChanges();
    listarPresentes.mockClear();

    eventosLive.next({
      item: {
        accesoUuid: 'acceso-live-1',
        userUuid: 'user-2',
        nombre: 'Ana',
        apellido: 'Perez',
        fecha: '2026-08-18T15:30:00',
        tipo: 'INGRESO',
        presente: true,
      },
      presenteCount: 4,
    });

    expect(componente.feedLive()[0]).toEqual(
      expect.objectContaining({ accesoUuid: 'acceso-live-1' }),
    );
    expect(listarPresentes).toHaveBeenCalledOnce();
    expect(componente.cargandoPresentes()).toBe(false);
  });

  it('normaliza una respuesta de presentes envuelta antes de actualizar el carrusel', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;
    listarPresentes.mockReturnValueOnce(
      of({
        presentes: [
          {
            userUuid: 'user-1',
            nombre: 'Brian',
            apellido: 'Sabatini',
            dni: '27123456',
            presente: true,
            ultimoAccesoAt: '03/08/2026 10:32:03',
          },
        ],
        count: 2,
      }) as any,
    );

    componente.cargarPresentes();

    expect(componente.presentes()).toHaveLength(1);
    expect(componente.ultimosTresIngresos()).toHaveLength(1);
  });

  it('muestra todos los presentes filtrados y sin paginación en modo Ingresos', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    componente.presentes.set([
      {
        userUuid: 'user-1',
        memberUuid: 'member-1',
        nombre: 'Brian',
        apellido: 'Sabatini',
        dni: '27123456',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:32:03',
      },
      {
        userUuid: 'user-2',
        memberUuid: 'member-2',
        nombre: 'Ana',
        apellido: 'Perez',
        dni: '30111222',
        presente: true,
        ultimoAccesoAt: '03/08/2026 10:34:03',
      },
    ] satisfies readonly PresenteClubDto[]);
    componente.paginaSocios.set(2);
    paginar.mockClear();
    listarPresentes.mockClear();
    listarPresentes.mockReturnValueOnce(
      of([
        {
          userUuid: 'user-1',
          memberUuid: 'member-1',
          nombre: 'Brian',
          apellido: 'Sabatini',
          dni: '27123456',
          presente: true,
          ultimoAccesoAt: '03/08/2026 10:32:03',
        },
        {
          userUuid: 'user-2',
          memberUuid: 'member-2',
          nombre: 'Ana',
          apellido: 'Perez',
          dni: '30111222',
          presente: true,
          ultimoAccesoAt: '03/08/2026 10:34:03',
        },
      ] satisfies readonly PresenteClubDto[]),
    );

    componente.cambiarModoListado('ingresos');
    fixture.detectChanges();

    expect(componente.paginaSocios()).toBe(1);
    expect(listarPresentes).toHaveBeenCalled();
    expect(paginar).not.toHaveBeenCalled();
    expect(componente.filasSocios()).toHaveLength(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-paginacion')).toBeNull();

    componente.busquedaSocios.set('30111222');
    expect(componente.filasSocios()).toEqual([
      expect.objectContaining({ userUuid: 'user-2', nombre: 'Ana' }),
    ]);
    expect(componente.accionesSocios[1].visible(componente.filasSocios()[0])).toBe(true);
  });

  it('vuelve al paginado remoto al seleccionar Todos', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    componente.modoListadoSocios.set('ingresos');
    componente.paginaSocios.set(3);
    paginar.mockClear();

    componente.cambiarModoListado('todos');
    fixture.detectChanges();

    expect(componente.paginaSocios()).toBe(1);
    expect(paginar).toHaveBeenCalledWith({
      page: 1,
      size: 5,
      search: '',
      estados: ['ACTIVO', 'MOROSO'],
    });
    expect((fixture.nativeElement as HTMLElement).querySelector('app-paginacion')).not.toBeNull();
  });

  it('muestra los spinners azules en los contenedores de carga reservados', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    componente.cargandoPresentes.set(true);
    componente.cargandoHistorial.set(true);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('app-carrusel-fade app-load-spinner-blue')).not.toBeNull();
    expect(
      elemento.querySelector('.gestion-accesos__feed-contenido app-load-spinner-blue'),
    ).not.toBeNull();
    expect(elemento.querySelector('.gestion-accesos__resultado')).toBeNull();
  });

  it('destaca y centra el estado vacío de personas presentes', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    componente.cargandoPresentes.set(false);
    componente.presentes.set([]);
    fixture.detectChanges();

    const estadoVacio = (fixture.nativeElement as HTMLElement).querySelector(
      '.gestion-accesos__estado-vacio',
    );
    expect(estadoVacio?.textContent).toContain('Sin ingresos');
    expect(estadoVacio?.getAttribute('style')).toContain(
      '--gestion-accesos-estado-vacio-contraste',
    );
  });

  it('actualiza el contorno del texto vacío según el tema activo', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    expect(componente.colorBordeEstadoVacio()).toBe('#FFFFFF');

    modoTemaResuelto.set('light');

    expect(componente.colorBordeEstadoVacio()).toBe('#000000');
  });

  it('muestra movimiento primero y omite estado del historial', () => {
    const fixture = TestBed.createComponent(GestionAccesosComponent);
    const componente = fixture.componentInstance as any;

    expect(componente.columnasHistorial.map((columna: { id: string }) => columna.id)).toEqual([
      'tipo',
      'persona',
      'fecha',
    ]);
  });
});
