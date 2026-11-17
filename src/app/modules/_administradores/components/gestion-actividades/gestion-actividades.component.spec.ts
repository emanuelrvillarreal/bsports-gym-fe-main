import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ActividadDto,
  ActividadInscriptoDto,
  PaginaActividadesResponse,
  PaginaInscripcionesActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { SociosPaginateResponse } from '../../../../core/api/interfaces/socios.interfaces';
import {
  PaginaUsuariosInternosResponse,
  ProfesorDto,
} from '../../../../core/api/interfaces/usuarios-internos.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { ProfesoresApiService } from '../../../../core/api/services/profesores-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { CategoriasApiService } from '../../../../core/api/services/categorias-api.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { SelectComponent } from '../../../ui/select/select.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionActividadesComponent } from './gestion-actividades.component';

describe('GestionActividadesComponent', () => {
  const paginaActividades = (totalPages = 1): PaginaActividadesResponse => ({
    content: [],
    totalElements: 0,
    totalPages,
    size: 10,
    number: 0,
    first: true,
    last: totalPages <= 1,
    numberOfElements: 0,
    empty: true,
  });

  const paginaProfesores: PaginaUsuariosInternosResponse<ProfesorDto> = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    size: 100,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };

  const paginaSocios: SociosPaginateResponse = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    size: 100,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };

  const paginarActividades = vi.fn(() => of(paginaActividades()));
  const paginarProfesores = vi.fn(() => of(paginaProfesores));
  const paginarSocios = vi.fn(() => of(paginaSocios));
  const detalleActividad = (inscriptos: readonly ActividadInscriptoDto[] = []): ActividadDto => ({
    actividadUuid: 'actividad-1',
    nombre: 'Yoga',
    ubicacion: 'Sala 1',
    cupoMaximo: 20,
    diasSemana: 'LUNES',
    horaInicio: '18:00:00',
    horaFin: '19:00:00',
    importeCuota: 1000,
    completa: false,
    profesores: [],
    categoria: null,
    inscriptos,
  });
  const obtenerDetalle = vi.fn(() => of(detalleActividad()));
  const paginaInscripcionesVacia: PaginaInscripcionesActividadDto = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    size: 50,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };
  const paginarInscripciones = vi.fn(() => of(paginaInscripcionesVacia));
  const registrarConsentimiento = vi.fn(() => of(void 0));
  const inscribir = vi.fn(() =>
    of({
      inscripcionUuid: 'inscripcion-1',
      actividadCompleta: false,
      cuotaGenerada: true,
    }),
  );
  const paginarCatalogoDescuentos = vi.fn(() =>
    of({
      content: [
        {
          descuentoUuid: 'descuento-1',
          titulo: 'Convenio',
          tipoValor: 'PORCENTAJE' as const,
          porcentaje: 20,
          montoFijo: null,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
  );
  const confirmar = vi.fn(() => Promise.resolve(false));

  beforeEach(() => {
    paginarActividades.mockReset();
    paginarActividades.mockReturnValue(of(paginaActividades()));
    paginarProfesores.mockReset();
    paginarProfesores.mockReturnValue(of(paginaProfesores));
    paginarSocios.mockReset();
    paginarSocios.mockReturnValue(of(paginaSocios));
    obtenerDetalle.mockReset();
    obtenerDetalle.mockReturnValue(of(detalleActividad()));
    paginarInscripciones.mockReset();
    paginarInscripciones.mockReturnValue(of(paginaInscripcionesVacia));
    registrarConsentimiento.mockReset();
    registrarConsentimiento.mockReturnValue(of(void 0));
    inscribir.mockReset();
    inscribir.mockReturnValue(
      of({
        inscripcionUuid: 'inscripcion-1',
        actividadCompleta: false,
        cuotaGenerada: true,
      }),
    );
    paginarCatalogoDescuentos.mockClear();
    confirmar.mockReset();
    confirmar.mockReturnValue(Promise.resolve(false));

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
      imports: [GestionActividadesComponent],
      providers: [
        {
          provide: ActividadesApiService,
          useValue: {
            paginar: paginarActividades,
            obtenerDetalle,
            crear: vi.fn(),
            actualizar: vi.fn(),
            inscribir,
            darDeBajaInscripcion: vi.fn(),
            paginarInscripciones,
            registrarConsentimiento,
            eliminar: vi.fn(),
          },
        },
        { provide: ProfesoresApiService, useValue: { paginar: paginarProfesores } },
        { provide: SociosApiService, useValue: { paginar: paginarSocios } },
        { provide: CategoriasApiService, useValue: { listar: vi.fn(() => of([])) } },
        {
          provide: DescuentosApiService,
          useValue: { paginarCatalogo: paginarCatalogoDescuentos },
        },
        {
          provide: ToastAlertService,
          useValue: { confirm: confirmar, confirmDanger: vi.fn(() => Promise.resolve(false)) },
        },
      ],
    });
  });

  it('mantiene tabla y paginacion montadas durante toda la carga inicial', async () => {
    const actividades = new Subject<PaginaActividadesResponse>();
    const profesores = new Subject<PaginaUsuariosInternosResponse<ProfesorDto>>();
    const socios = new Subject<SociosPaginateResponse>();
    paginarActividades.mockReturnValueOnce(actividades.asObservable());
    paginarProfesores.mockReturnValueOnce(profesores.asObservable());
    paginarSocios.mockReturnValueOnce(socios.asObservable());

    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-tabla-responsive')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-paginacion')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.tabla-responsive')
        ?.style.getPropertyValue('--tabla-max-filas'),
    ).toBe('5');

    actividades.next(paginaActividades());
    actividades.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tabla-responsive__cargando')).toBeNull();

    profesores.next(paginaProfesores);
    profesores.complete();
    fixture.detectChanges();

    socios.next(paginaSocios);
    socios.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay actividades para mostrar.');
  });

  it('muestra carga en Buscar y en la tabla al buscar por texto', async () => {
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const respuesta = new Subject<PaginaActividadesResponse>();
    paginarActividades.mockReturnValueOnce(respuesta.asObservable());
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Yoga';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const botonBuscar = fixture.nativeElement.querySelector(
      '.gestion-actividades__busqueda > app-boton button',
    ) as HTMLButtonElement;
    botonBuscar.click();
    fixture.detectChanges();

    expect(paginarActividades).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      search: 'Yoga',
      completa: null,
    });
    expect(botonBuscar.getAttribute('aria-busy')).toBe('true');
    expect(botonBuscar.getAttribute('aria-label')).toBe('Buscando actividades');
    expect(
      fixture.nativeElement.querySelector('.tabla-responsive__cargando--reservado'),
    ).not.toBeNull();

    respuesta.next(paginaActividades());
    respuesta.complete();
    fixture.detectChanges();
    expect(botonBuscar.getAttribute('aria-busy')).toBeNull();
  });

  it('alinea disponibilidad con la busqueda y abre el alta desde su boton', async () => {
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.componentRef.setInput('puedeAdministrar', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    const busqueda = fixture.nativeElement.querySelector(
      '.gestion-actividades__busqueda',
    ) as HTMLElement;
    const botonAgregar = fixture.nativeElement.querySelector(
      'button[aria-label="Nueva actividad"]',
    ) as HTMLButtonElement;

    expect(input.placeholder).toBe('Busca por nombre de actividad o ubicación');
    expect(busqueda.querySelector('app-select')).not.toBeNull();
    expect(botonAgregar).not.toBeNull();

    botonAgregar.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Complet');
  });

  it('carga la tabla y bloquea la paginacion al filtrar por disponibilidad', async () => {
    paginarActividades.mockReturnValueOnce(of(paginaActividades(3)));
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const respuesta = new Subject<PaginaActividadesResponse>();
    paginarActividades.mockReturnValueOnce(respuesta.asObservable());
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    select.valueChange.emit('true');
    fixture.detectChanges();

    expect(paginarActividades).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      search: '',
      completa: true,
    });
    expect(
      fixture.nativeElement.querySelector('.tabla-responsive__cargando--reservado'),
    ).not.toBeNull();
    expect(
      (
        fixture.nativeElement.querySelector(
          'button[aria-label="Ir a pagina 2"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    respuesta.next(paginaActividades());
    respuesta.complete();
  });

  it('pagina profesores de a 50 y limita la tabla del popup a 4 filas', async () => {
    paginarProfesores.mockReturnValueOnce(
      of({
        ...paginaProfesores,
        content: [
          {
            profesorUuid: 'profesor-1',
            nombre: 'Ana',
            apellido: 'Pérez',
            email: 'ana@example.com',
            dni: '30123456',
            estado: 'ACTIVO',
          },
        ],
        totalElements: 51,
        totalPages: 2,
        size: 50,
        numberOfElements: 1,
        empty: false,
        last: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.componentRef.setInput('puedeAdministrar', true);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { abrirAlta(): void }).abrirAlta();
    fixture.detectChanges();

    expect(paginarProfesores).toHaveBeenLastCalledWith({
      page: 1,
      size: 50,
      search: '',
      estados: ['ACTIVO'],
    });
    const tablas = fixture.nativeElement.querySelectorAll('app-tabla-responsive');
    const tablaProfesores = tablas[0] as HTMLElement;
    expect(
      tablaProfesores
        .querySelector<HTMLElement>('.tabla-responsive')
        ?.style.getPropertyValue('--tabla-max-filas'),
    ).toBe('4');
    expect(
      tablaProfesores.querySelector('.tabla-responsive__acciones-titulo')?.textContent?.trim(),
    ).toBe('Seleccionar');
  });

  it('pagina socios para inscribir, formatea DNI y busca desde la primera página', async () => {
    paginarSocios.mockReturnValueOnce(
      of({
        ...paginaSocios,
        content: [
          {
            memberUuid: 'socio-1',
            nombre: 'Ana',
            apellido: 'Pérez',
            email: 'ana@example.com',
            dni: '30123456',
            imageUrl: 'https://example.com/ana.jpg',
            fechaNacimiento: '2000-01-15',
            estado: 'ACTIVO',
          },
        ],
        totalElements: 101,
        totalPages: 2,
        numberOfElements: 1,
        empty: false,
        last: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    (
      fixture.componentInstance as unknown as {
        prepararInscripcion(fila: { actividadUuid: string }): void;
      }
    ).prepararInscripcion({ actividadUuid: 'actividad-1' });
    fixture.detectChanges();

    expect(paginarSocios).toHaveBeenLastCalledWith({
      page: 1,
      size: 100,
      search: '',
      estados: ['ACTIVO'],
    });
    expect(fixture.nativeElement.textContent).toContain('30.123.456');
    expect(fixture.nativeElement.textContent).toContain('26 años');
    expect(fixture.nativeElement.textContent).toContain('días');
    expect(fixture.nativeElement.querySelector('img[src="https://example.com/ana.jpg"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Ir a pagina 2"]')).not.toBeNull();
    const tablaSocios = fixture.nativeElement.querySelector(
      '.gestion-actividades__busqueda-socios + app-tabla-responsive .tabla-responsive',
    ) as HTMLElement | null;
    expect(tablaSocios?.style.getPropertyValue('--tabla-max-filas')).toBe('4');

    const input = fixture.nativeElement.querySelector(
      '#busqueda-socios-inscripcion',
    ) as HTMLInputElement;
    input.value = 'Pérez';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(paginarSocios).toHaveBeenLastCalledWith({
      page: 1,
      size: 100,
      search: 'Pérez',
      estados: ['ACTIVO'],
    });
  });

  it('inscribe administrativamente con descuento opcional o sin descuentos', async () => {
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const componente = fixture.componentInstance as unknown as {
      prepararInscripcion(fila: { actividadUuid: string }): void;
      manejarAccionSocioInscripcion(evento: {
        accion: string;
        fila: {
          memberUuid: string;
          imageUrl: null;
          nombre: string;
          apellido: string;
          nombreCompleto: string;
          dni: string;
          edad: string;
        };
      }): void;
      agregarDescuentoInscripcion(payload: {
        descuentoUuid: string;
        fechaDesde: string;
        fechaHasta: string | null;
      }): void;
      abrirInscripcionConDescuento(): void;
      inscribirSinDescuento(): void;
      confirmarInscripcionConDescuentos(): void;
      confirmarInscripcion(memberUuid: string): void;
      horariosInscripcionSeleccionados: { set(value: readonly string[]): void };
    };
    componente.prepararInscripcion({ actividadUuid: 'actividad-1' });
    componente.manejarAccionSocioInscripcion({
      accion: 'inscribir',
      fila: {
        memberUuid: 'member-1',
        imageUrl: null,
        nombre: 'Ana',
        apellido: 'Pérez',
        nombreCompleto: 'Ana Pérez',
        dni: '30.123.456',
        edad: '26 años',
      },
    });
    componente.horariosInscripcionSeleccionados.set(['horario-1']);
    fixture.detectChanges();

    expect(paginarCatalogoDescuentos).toHaveBeenCalledWith({
      page: 1,
      size: 100,
      search: '',
    });
    expect(fixture.nativeElement.querySelectorAll('.gestion-actividades__opcion-inscripcion')).toHaveLength(2);
    componente.abrirInscripcionConDescuento();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-selector-descuentos')).not.toBeNull();

    const descuento = {
      descuentoUuid: 'descuento-1',
      fechaDesde: '2026-09-01',
      fechaHasta: null,
    };
    componente.agregarDescuentoInscripcion(descuento);
    const segundoDescuento = {
      descuentoUuid: 'descuento-2',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-12-31',
    };
    componente.agregarDescuentoInscripcion(segundoDescuento);
    componente.confirmarInscripcionConDescuentos();
    expect(inscribir).toHaveBeenLastCalledWith('actividad-1', {
      memberUuid: 'member-1',
      descuentos: [descuento, segundoDescuento],
      horarioUuids: ['horario-1'],
    });

    componente.prepararInscripcion({ actividadUuid: 'actividad-1' });
    componente.manejarAccionSocioInscripcion({
      accion: 'inscribir',
      fila: {
        memberUuid: 'member-2',
        imageUrl: null,
        nombre: 'Beto',
        apellido: 'Pérez',
        nombreCompleto: 'Beto Pérez',
        dni: '30.123.457',
        edad: '25 años',
      },
    });
    componente.horariosInscripcionSeleccionados.set(['horario-2']);
    componente.inscribirSinDescuento();
    expect(inscribir).toHaveBeenLastCalledWith('actividad-1', {
      memberUuid: 'member-2',
      horarioUuids: ['horario-2'],
    });
  });

  it('muestra los cupos como inscriptos sobre máximo y marca en rojo una actividad completa', async () => {
    paginarActividades.mockReturnValueOnce(
      of({
        ...paginaActividades(),
        content: [
          {
            actividadUuid: 'actividad-1',
            nombre: 'Yoga',
            ubicacion: 'Sala 1',
            cupoMaximo: 3,
            diasSemana: 'LUNES',
            horaInicio: '18:00:00',
            horaFin: '19:00:00',
            importeCuota: 1000,
            completa: true,
            categoriaNombre: 'Adultos',
            categoriaNombres: ['Adultos', 'Juveniles'],
            cantidadInscriptos: 3,
          },
        ],
        totalElements: 1,
        numberOfElements: 1,
        empty: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector(
      '.tabla-responsive__chip--danger',
    ) as HTMLElement;
    expect(chip.textContent?.trim()).toBe('3/3');

    const celdaCategoria = fixture.nativeElement.querySelector(
      'td[data-label="Categoría"] .gestion-actividades__categoria-celda',
    ) as HTMLElement;
    expect(celdaCategoria.textContent?.replace(/\s+/g, '').trim()).toBe('Adultos+2');
    (celdaCategoria.parentElement as HTMLElement).click();

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain('Adultos, Juveniles');
  });

  it('muestra el detalle, pagina 50 inscriptos y abre los datos completos del profesor', async () => {
    const inscriptos = Array.from({ length: 51 }, (_, indice) => ({
      memberUuid: `socio-${indice + 1}`,
      nombre: `Socio ${indice + 1}`,
      apellido: 'Prueba',
      imageUrl: indice === 0 ? 'https://example.com/foto.jpg' : null,
      email: `socio${indice + 1}@example.com`,
      dni: String(30000000 + indice),
    }));
    obtenerDetalle.mockReturnValueOnce(
      of({
        ...detalleActividad(inscriptos),
        diasSemana: 'LUNES;MARTES;MIERCOLES;JUEVES;VIERNES;SABADO;DOMINGO',
        categoria: {
          categoriaUuid: 'categoria-1',
          nombre: 'Infantil',
          descripcion: 'Actividad para niños.',
          edadMinima: 6,
          edadMaxima: 10,
        },
        categorias: [
          {
            categoriaUuid: 'categoria-1',
            nombre: 'Infantil',
            descripcion: 'Actividad infantil.',
            edadMinima: 6,
            edadMaxima: 10,
          },
          {
            categoriaUuid: 'categoria-2',
            nombre: 'Adultos',
            descripcion: 'Actividad para mayores.',
            edadMinima: 18,
            edadMaxima: 80,
          },
        ],
        profesores: [
          {
            profesorUuid: 'profesor-1',
            estado: 'ACTIVO',
            fechaAlta: '17/07/2026',
            nombre: 'Ana',
            apellido: 'Pérez',
            dni: '30123456',
            telefono: '1122334455',
            email: 'ana@example.com',
            imageUrl: 'https://example.com/profesora.jpg',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    (
      fixture.componentInstance as unknown as {
        verInscriptos(fila: {
          actividadUuid: string;
          nombre: string;
          ubicacion: string;
          diasSemana: string;
          horario: string;
          cupoMaximo: number;
          importeCuota: number;
          completa: boolean;
          categoria: string;
          cantidadInscriptos: number;
        }): void;
      }
    ).verInscriptos({
      actividadUuid: 'actividad-1',
      nombre: 'Yoga',
      ubicacion: 'Sala 1',
      diasSemana: 'LUNES',
      horario: '18:00–19:00',
      cupoMaximo: 20,
      importeCuota: 1000,
      completa: false,
      categoria: 'Infantil',
      cantidadInscriptos: 51,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Actividad infantil.');
    expect(fixture.nativeElement.textContent).toContain('Todos los días');
    expect(fixture.nativeElement.textContent).toContain('51 en total');
    const detallesCategorias = fixture.nativeElement.querySelectorAll(
      '.gestion-actividades__detalle-categorias',
    ) as NodeListOf<HTMLDetailsElement>;
    expect(detallesCategorias).toHaveLength(1);
    const resumenCategorias = detallesCategorias[0].querySelector('summary');
    expect(resumenCategorias?.textContent).toContain('Infantil');
    expect(resumenCategorias?.textContent).toContain('2');
    expect(resumenCategorias?.textContent).toContain('6');
    expect(resumenCategorias?.textContent).not.toContain('Adultos');
    detallesCategorias[0].querySelector('summary')?.click();
    expect(detallesCategorias[0].open).toBe(true);
    expect(detallesCategorias[0].textContent).toContain('Adultos');
    expect(detallesCategorias[0].textContent).toContain('18');
    expect(detallesCategorias[0].textContent).toContain('80');
    expect(detallesCategorias[0].textContent).not.toContain('Actividad para mayores.');
    expect(fixture.nativeElement.textContent).toContain('De 6 años a 10 años');
    expect(fixture.nativeElement.textContent).not.toContain('Edad mínima');
    expect(fixture.nativeElement.textContent).not.toContain('Consentimiento de menores');
    expect(
      fixture.nativeElement.querySelector('img[src="https://example.com/profesora.jpg"]'),
    ).not.toBeNull();
    const tablaDetalle = fixture.nativeElement.querySelector(
      '.gestion-actividades__seccion app-tabla-responsive',
    ) as HTMLElement;
    expect(
      tablaDetalle
        .querySelector<HTMLElement>('.tabla-responsive')
        ?.style.getPropertyValue('--tabla-max-filas'),
    ).toBe('4');
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Ir a pagina 2"]'),
    ).not.toBeNull();

    const botonProfesor = fixture.nativeElement.querySelector(
      'button[aria-label="Ver todos los datos de Ana Pérez"]',
    ) as HTMLButtonElement;
    botonProfesor.click();
    fixture.detectChanges();

    const detalleProfesor = fixture.nativeElement.querySelector(
      '.gestion-actividades__profesor-detalle',
    ) as HTMLElement;
    expect(detalleProfesor.textContent).toContain('Ana Pérez');
    expect(detalleProfesor.textContent).toContain('30.123.456');
    expect(detalleProfesor.textContent).toContain('11 2233-4455');
    expect(fixture.nativeElement.textContent).toContain('ana@example.com');
    expect(detalleProfesor.textContent).not.toContain('UUID');
    expect(detalleProfesor.textContent).not.toContain('Estado');
    expect(
      fixture.nativeElement.querySelector('img[src="https://example.com/profesora.jpg"]'),
    ).not.toBeNull();
  });

  it('ofrece y registra el consentimiento solo para familiares menores de 14 años', async () => {
    obtenerDetalle.mockReturnValueOnce(
      of(
        detalleActividad([
          {
            memberUuid: 'menor-1',
            nombre: 'Sofía',
            apellido: 'Pérez',
            imageUrl: null,
            email: 'sofia@example.com',
            dni: '50123456',
            titularMemberUuid: 'titular-1',
            fechaNacimiento: '2015-08-10',
          },
          {
            memberUuid: 'adulto-1',
            nombre: 'Juan',
            apellido: 'Pérez',
            imageUrl: null,
            email: 'juan@example.com',
            dni: '40123456',
            titularMemberUuid: 'titular-1',
            fechaNacimiento: '2000-08-10',
          },
        ]),
      ),
    );
    confirmar.mockReturnValueOnce(Promise.resolve(true));

    const fixture = TestBed.createComponent(GestionActividadesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { verInscriptos(fila: { actividadUuid: string }): void }).verInscriptos({
      actividadUuid: 'actividad-1',
    });
    fixture.detectChanges();

    const botonConsentimiento = fixture.nativeElement.querySelector(
      'button[aria-label="Registrar consentimiento"]',
    ) as HTMLButtonElement;
    expect(botonConsentimiento).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button[aria-label="Registrar consentimiento"]')).toHaveLength(1);

    botonConsentimiento.click();
    await fixture.whenStable();

    expect(registrarConsentimiento).toHaveBeenCalledWith('actividad-1', {
      memberUuid: 'menor-1',
      responsableMemberUuid: 'titular-1',
      aceptado: true,
    });
  });

});
