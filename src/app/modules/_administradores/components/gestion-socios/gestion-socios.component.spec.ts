import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SocioDto,
  SociosPaginateResponse,
} from '../../../../core/api/interfaces/socios.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { GestionSociosComponent } from './gestion-socios.component';

/**
 * Busca una acción de fila: el botón visible o, si quedó agrupada en el menú ⋯, su ítem
 * (abriendo el menú si hace falta).
 */
function buscarAccionFila(
  contenedor: HTMLElement,
  texto: string,
  fixture: ComponentFixture<unknown>,
): HTMLButtonElement | null {
  const enLinea = contenedor.querySelector<HTMLButtonElement>(`button[aria-label="${texto}"]`);
  if (enLinea) return enLinea;
  const buscarEnMenu = () =>
    Array.from(contenedor.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((item) =>
      item.textContent?.trim().startsWith(texto),
    ) ?? null;
  const yaAbierto = buscarEnMenu();
  if (yaAbierto) return yaAbierto;
  contenedor.querySelector<HTMLButtonElement>('button[aria-label="Más acciones"]')?.click();
  fixture.detectChanges();
  return buscarEnMenu();
}

describe('GestionSociosComponent', () => {
  const paginar = vi.fn(() =>
    of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    } as SociosPaginateResponse),
  );
  const actualizarEstado = vi.fn(() =>
    of({
      memberUuid: 'member-actualizado',
      nombre: 'Socio',
      apellido: 'Actualizado',
      email: 'socio@example.com',
      estado: 'ACTIVO' as const,
    }),
  );
  const listarFamiliares = vi.fn(() => of([] as readonly SocioDto[]));
  const listarCertificados = vi.fn(() => of([]));
  const actualizarEstadoCertificado = vi.fn();
  const iniciarImportacion = vi.fn();
  const observarProgresoImportacion = vi.fn();
  const obtenerResultadoImportacion = vi.fn();
  const confirmar = vi.fn(() => Promise.resolve(false));
  const confirmarPeligro = vi.fn(() => Promise.resolve(false));
  const paginarCatalogoDescuentos = vi.fn(() =>
    of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 100,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    }),
  );

  beforeEach(() => {
    paginar.mockClear();
    actualizarEstado.mockClear();
    listarFamiliares.mockClear();
    listarCertificados.mockClear();
    actualizarEstadoCertificado.mockClear();
    iniciarImportacion.mockReset();
    observarProgresoImportacion.mockReset();
    obtenerResultadoImportacion.mockReset();
    obtenerResultadoImportacion.mockReturnValue(
      of({
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        totalRows: 10,
        successCount: 8,
        errorCount: 1,
        warningCount: 1,
        importStatus: 'COMPLETED',
        errorMessage: null,
        dateCreated: '2026-08-19T10:30:00',
        rows: [
          {
            rowNumber: 1,
            status: 'SUCCESS',
            tipo: 'TITULAR',
            memberUuid: 'member-1',
            numeroSocio: '001',
            errorMessage: null,
            warnings: [],
          },
          {
            rowNumber: 2,
            status: 'ERROR',
            tipo: null,
            memberUuid: null,
            numeroSocio: null,
            errorMessage: 'Email duplicado en el archivo',
            warnings: ['Se omitió la fila'],
          },
        ],
      }),
    );
    sessionStorage.clear();
    confirmar.mockReset();
    confirmar.mockResolvedValue(false);
    confirmarPeligro.mockReset();
    confirmarPeligro.mockResolvedValue(false);
    paginarCatalogoDescuentos.mockClear();
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
      imports: [GestionSociosComponent],
      providers: [
        {
          provide: SociosApiService,
          useValue: {
            paginar,
            crearTitular: vi.fn(),
            crearFamiliar: vi.fn(),
            actualizar: vi.fn(),
            actualizarEstado,
            actualizarEstadoCertificado,
            iniciarImportacion,
            observarProgresoImportacion,
            obtenerResultadoImportacion,
            listarFamiliares,
            listarCertificados,
          },
        },
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-1' },
        },
        {
          provide: DescuentosApiService,
          useValue: { paginarCatalogo: paginarCatalogoDescuentos },
        },
        {
          provide: ToastAlertService,
          useValue: {
            confirm: confirmar,
            confirmDanger: confirmarPeligro,
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function abrirImportacionYSeleccionarArchivo(
    fixture: ComponentFixture<GestionSociosComponent>,
    archivo: File,
  ): Promise<void> {
    const botonAbrir = fixture.nativeElement.querySelector(
      'button[aria-label="Importar socios"]',
    ) as HTMLButtonElement;
    botonAbrir.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('#socios-archivo') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: { 0: archivo, length: 1 } });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function buscarBotonPorTexto(
    elemento: HTMLElement,
    texto: string,
  ): HTMLButtonElement | undefined {
    return Array.from(elemento.querySelectorAll<HTMLButtonElement>('button')).find(
      (boton) => boton.textContent?.trim() === texto,
    );
  }

  it('inicia el listado en página 1 y representa el estado vacío', () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(paginar).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      search: '',
      titular: true,
      estados: [],
    });
    expect(fixture.nativeElement.textContent).not.toContain('Filas por página');
    expect(fixture.nativeElement.textContent).toContain(
      'No hay socios para los filtros seleccionados.',
    );
  });

  it('pide confirmación antes de validar un certificado pendiente', async () => {
    const certificado = {
      certificadoUuid: 'certificado-1',
      memberUuid: 'socio-1',
      fechaCarga: '2026-09-14',
      fechaExpiracion: '2027-09-14',
      nombreArchivo: 'certificado.pdf',
      estado: 'PENDIENTE_VALIDACION' as const,
    };
    confirmar.mockResolvedValueOnce(true);
    actualizarEstadoCertificado.mockReturnValueOnce(of({ ...certificado, estado: 'CONFIRMADO' }));
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as any).manejarAccionCertificado({
      accion: 'confirmar-certificado',
      fila: certificado,
    });

    expect(confirmar).toHaveBeenCalledWith(
      'El certificado quedará validado y no podrá volver a estado pendiente desde esta pantalla.',
      {
        titulo: 'Confirmar certificado médico',
        textoConfirmar: 'Confirmar',
      },
    );
    expect(actualizarEstadoCertificado).toHaveBeenCalledWith('certificado-1', {
      estado: 'CONFIRMADO',
    });
  });

  it('pide confirmación de peligro antes de denegar un certificado pendiente', async () => {
    const certificado = {
      certificadoUuid: 'certificado-1',
      memberUuid: 'socio-1',
      fechaCarga: '2026-09-14',
      fechaExpiracion: '2027-09-14',
      nombreArchivo: 'certificado.pdf',
      estado: 'PENDIENTE_VALIDACION' as const,
    };
    confirmarPeligro.mockResolvedValueOnce(true);
    actualizarEstadoCertificado.mockReturnValueOnce(of({ ...certificado, estado: 'DENEGADO' }));
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as any).manejarAccionCertificado({
      accion: 'denegar-certificado',
      fila: certificado,
    });

    expect(confirmarPeligro).toHaveBeenCalledWith(
      'El certificado quedará denegado y no podrá volver a estado pendiente desde esta pantalla.',
      {
        titulo: 'Denegar certificado médico',
        textoConfirmar: 'Denegar',
      },
    );
    expect(actualizarEstadoCertificado).toHaveBeenCalledWith('certificado-1', {
      estado: 'DENEGADO',
    });
  });

  it('muestra el estado y la acción final de certificado denegado en rojo', () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;
    const columnaEstado = componente.columnasCertificados.find(
      (columna: { id: string }) => columna.id === 'estado',
    );
    const accionDenegado = componente.accionesCertificados.find(
      (accion: { id: string }) => accion.id === 'certificado-denegado',
    );

    expect(columnaEstado.estadoClase('DENEGADO')).toBe('tabla-responsive__estado--denegado');
    expect(accionDenegado.icono).toBe('heroXMark');
    expect(accionDenegado.color).toBe('var(--semantic-danger)');
    expect(accionDenegado.visible({ estado: 'DENEGADO' })).toBe(true);
    expect(accionDenegado.deshabilitada()).toBe(true);
  });

  it('ofrece la plantilla de importación en el popup', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const botonAbrir = fixture.nativeElement.querySelector(
      'button[aria-label="Importar socios"]',
    ) as HTMLButtonElement;
    botonAbrir.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const botonPlantilla = fixture.nativeElement.querySelector(
      'button[aria-label="Descargar plantilla de importación de socios"]',
    ) as HTMLButtonElement;

    expect(botonPlantilla.textContent).toContain('Plantilla');
    expect(botonPlantilla.querySelector('ng-icon[name="heroDocumentText"]')).not.toBeNull();
    expect(botonPlantilla.querySelector('ng-icon[name="heroArrowDownTray"]')).not.toBeNull();
  });

  it('muestra la carga inicial dentro de la tabla y conserva su alto reservado', () => {
    const cargaInicial = new Subject<SociosPaginateResponse>();
    paginar.mockReturnValueOnce(cargaInicial.asObservable());
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.gestion-socios__estado')).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-paginacion')).not.toBeNull();

    cargaInicial.next({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    });
    cargaInicial.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay socios para los filtros seleccionados.',
    );
  });

  it('mantiene el spinner del botón y también carga la tabla al aplicar filtros', () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();
    const cargaFiltrada = new Subject<SociosPaginateResponse>();
    paginar.mockReturnValueOnce(cargaFiltrada.asObservable());
    const input = fixture.nativeElement.querySelector('#socios-busqueda') as HTMLInputElement;
    input.value = 'Pérez';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('.formulario-filtro-socios')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('.formulario-filtro-socios button')
        ?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();

    cargaFiltrada.complete();
  });

  it('muestra la foto como primera columna de la tabla de socios', () => {
    paginar.mockReturnValueOnce(
      of({
        content: [
          {
            memberUuid: 'member-1',
            nombre: 'Ana',
            apellido: 'Pérez',
            email: 'ana@example.com',
            imageUrl: 'https://cdn.example.com/ana.jpg',
            fechaNacimiento: '2000-01-15',
            fechaAlta: '2026-06-01',
            parentesco: null,
            estado: 'ACTIVO' as const,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const tablaPrincipal = fixture.nativeElement.querySelector(
      '.gestion-socios > app-card app-tabla-responsive',
    ) as HTMLElement;
    const encabezados = Array.from(
      tablaPrincipal.querySelectorAll('thead th') as NodeListOf<HTMLTableCellElement>,
    ).map((celda) => celda.textContent?.trim());
    const foto = fixture.nativeElement.querySelector(
      'tbody img[src="https://cdn.example.com/ana.jpg"]',
    ) as HTMLImageElement | null;

    expect(encabezados[0]).toBe('Foto');
    expect(encabezados).toContain('Edad');
    expect(encabezados).toContain('Fecha de alta');
    expect(encabezados).not.toContain('Parentesco');
    expect(foto?.alt).toBe('Ana Pérez');
    expect(tablaPrincipal.textContent).toContain('1/6/2026');
    expect(tablaPrincipal.textContent).toContain('años');
  });

  it('conserva parentesco y agrega fecha de alta en la tabla de familiares', () => {
    paginar.mockReturnValueOnce(
      of({
        content: [
          {
            memberUuid: 'titular-1',
            nombre: 'Ana',
            apellido: 'Pérez',
            email: 'ana@example.com',
            tieneFamiliares: true,
            estado: 'ACTIVO' as const,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false,
      }),
    );
    listarFamiliares.mockReturnValueOnce(
      of([
        {
          memberUuid: 'familiar-1',
          nombre: 'Luis',
          apellido: 'Pérez',
          email: 'luis@example.com',
          parentesco: 'HIJO' as const,
          fechaAlta: '2026-06-02',
          estado: 'ACTIVO' as const,
        },
      ]),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const botonFamiliares = buscarAccionFila(
      fixture.nativeElement,
      'Ver familiares',
      fixture,
    ) as HTMLButtonElement;
    botonFamiliares.click();
    fixture.detectChanges();

    const tablaFamiliares = fixture.nativeElement.querySelector(
      'app-grupo-familiar-socio app-tabla-responsive',
    ) as HTMLElement;
    const encabezados = Array.from(
      tablaFamiliares.querySelectorAll('thead th') as NodeListOf<HTMLTableCellElement>,
    ).map((celda) => celda.textContent?.trim());

    expect(listarFamiliares).toHaveBeenCalledWith('titular-1');
    expect(encabezados).toContain('Parentesco');
    expect(encabezados).toContain('Edad');
    expect(encabezados).toContain('Fecha de alta');
    expect(tablaFamiliares.textContent).toContain('HIJO');
    expect(tablaFamiliares.textContent).toContain('2/6/2026');
    const botonCambiarEstado = buscarAccionFila(
      tablaFamiliares,
      'Dar de baja',
      fixture,
    ) as HTMLButtonElement;
    botonCambiarEstado.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dar de baja al socio');
  });

  it('muestra ver familiares en gris y deshabilitado cuando no tiene familiares', () => {
    paginar.mockReturnValueOnce(
      of({
        content: [
          {
            memberUuid: 'titular-sin-familiares',
            nombre: 'Ana',
            apellido: 'Perez',
            email: 'ana@example.com',
            tieneFamiliares: false,
            estado: 'ACTIVO' as const,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    // Con más de dos acciones, "Ver familiares" queda dentro del menú ⋯ de la fila.
    const boton = buscarAccionFila(
      fixture.nativeElement,
      'Ver familiares',
      fixture,
    ) as HTMLButtonElement;

    expect(boton.style.getPropertyValue('--tabla-menu-item-color')).toBe(
      'var(--gestion-socios-familiares-inactivo)',
    );
    expect(boton.disabled).toBe(true);
    boton.click();
    expect(listarFamiliares).not.toHaveBeenCalled();
  });

  it('reactiva un socio inactivo desde la acción Activo', async () => {
    paginar.mockReturnValueOnce(
      of({
        content: [
          {
            memberUuid: 'member-inactivo',
            nombre: 'Luis',
            apellido: 'Pérez',
            email: 'luis@example.com',
            estado: 'INACTIVO' as const,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false,
      }),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const botonCambiarEstado = buscarAccionFila(fixture.nativeElement, 'Activo', fixture);
    const botonCertificados = buscarAccionFila(fixture.nativeElement, 'Ver certificados', fixture);

    expect(botonCambiarEstado).not.toBeNull();
    expect(botonCertificados).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tbody tr')?.classList).toContain(
      'tabla-responsive__fila--peligro',
    );
    expect(fixture.nativeElement.querySelector('.tabla-responsive__estado')?.classList).toContain(
      'tabla-responsive__estado--inactivo',
    );
    botonCambiarEstado?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(actualizarEstado).toHaveBeenCalledWith('member-inactivo', { estado: 'ACTIVO' });
  });

  it('ofrece los estados de baja y reactiva cualquier estado no activo', () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    const componente = fixture.componentInstance as unknown as {
      opcionesEstadoSocio: readonly { readonly value: string }[];
      accionesSocios: readonly {
        readonly texto: string;
        readonly color: string;
        readonly visible?: (socio: SocioDto) => boolean;
      }[];
      abrirCambioEstado(socio: SocioDto): void;
    };
    const estadosDeBaja = ['INACTIVO', 'MOROSO', 'INHABILITADO', 'SUSPENDIDO'] as const;
    const accionBaja = componente.accionesSocios.find((accion) => accion.texto === 'Dar de baja');
    const accionActivo = componente.accionesSocios.find((accion) => accion.texto === 'Activo');

    expect(componente.opcionesEstadoSocio.map((opcion) => opcion.value)).toEqual(estadosDeBaja);
    expect(accionBaja?.visible?.({ memberUuid: 'activo', estado: 'ACTIVO' } as SocioDto)).toBe(
      true,
    );
    expect(accionActivo?.color).toBe('var(--semantic-success)');

    for (const estado of estadosDeBaja) {
      const socio = { memberUuid: estado, estado } as SocioDto;

      expect(accionBaja?.visible?.(socio)).toBe(false);
      expect(accionActivo?.visible?.(socio)).toBe(true);
      componente.abrirCambioEstado(socio);
      expect(actualizarEstado).toHaveBeenCalledWith(estado, { estado: 'ACTIVO' });
    }
  });

  it('mantiene abierto el popup de estado cuando la actualización falla', () => {
    paginar.mockReturnValueOnce(
      of({
        content: [
          {
            memberUuid: 'member-1',
            nombre: 'Ana',
            apellido: 'Pérez',
            email: 'ana@example.com',
            estado: 'ACTIVO' as const,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false,
      }),
    );
    actualizarEstado.mockReturnValueOnce(throwError(() => new Error('Sin permisos')));
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    (
      fixture.componentInstance as unknown as {
        abrirCambioEstado(socio: SocioDto): void;
        seleccionarEstado(estado: string): void;
        cambiarEstadoSocio(): void;
      }
    ).abrirCambioEstado({
      memberUuid: 'member-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      estado: 'ACTIVO',
    });
    const componente = fixture.componentInstance as unknown as {
      seleccionarEstado(estado: string): void;
      cambiarEstadoSocio(): void;
    };
    componente.seleccionarEstado('SUSPENDIDO');
    componente.cambiarEstadoSocio();
    fixture.detectChanges();

    expect(actualizarEstado).toHaveBeenCalledWith('member-1', { estado: 'SUSPENDIDO' });
    expect(fixture.nativeElement.textContent).toContain('Dar de baja al socio');
  });

  it('abre el formulario en un popup desde el botón nuevo de la tabla', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      'button[aria-label="Nuevo titular"]',
    ) as HTMLButtonElement | null;
    boton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const popup = fixture.debugElement
      .queryAll(By.directive(PopupComponent))
      .map((elemento) => elemento.componentInstance as PopupComponent)
      .find((elemento) => elemento.abierto());
    const formulario = fixture.nativeElement.querySelector('.formulario-gestion-socio');
    expect(popup?.abierto()).toBe(true);
    expect(formulario?.firstElementChild?.getAttribute('role')).toBe('alert');
    expect(fixture.nativeElement.textContent).toContain('Nuevo socio titular');
    expect(fixture.nativeElement.textContent).toContain('Cancelar');
    expect(fixture.nativeElement.querySelector('#socio-fecha-alta')).toBeNull();
  });

  it('abre la importacion en un popup desde la cabecera de la tabla', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      'button[aria-label="Importar socios"]',
    ) as HTMLButtonElement | null;
    boton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const dialogo = Array.from(
      fixture.nativeElement.querySelectorAll('dialog') as NodeListOf<HTMLDialogElement>,
    ).find((elemento) => elemento.open);

    expect(dialogo?.textContent).toContain('Importar socios');
    expect(dialogo?.textContent).toContain(
      'Las columnas no distinguen entre mayúsculas y minúsculas',
    );
    expect(dialogo?.textContent).toContain('Titular DNI');
    expect(dialogo?.querySelector('input[type="file"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Importación desde Excel');
  });

  it('permite seleccionar un archivo Excel arrastrándolo al selector', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      'button[aria-label="Importar socios"]',
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const selector = fixture.nativeElement.querySelector(
      '.gestion-socios__selector-archivo',
    ) as HTMLLabelElement;
    const archivo = new File(['contenido'], 'socios.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    selector.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(selector.classList).toContain('gestion-socios__selector-archivo--arrastrando');
    expect(selector.textContent).toContain('Soltá el archivo para seleccionarlo');

    const eventoDrop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(eventoDrop, 'dataTransfer', {
      value: { files: { 0: archivo, length: 1, item: () => archivo } },
    });
    selector.dispatchEvent(eventoDrop);
    fixture.detectChanges();

    expect(selector.classList).not.toContain('gestion-socios__selector-archivo--arrastrando');
    expect(selector.classList).toContain('gestion-socios__selector-archivo--seleccionado');
    expect(selector.textContent).toContain('socios.xlsx');
    expect(selector.textContent).toContain('Archivo listo para importar');
  });

  it('muestra el progreso por filas y el resumen agregado al finalizar', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    iniciarImportacion.mockReturnValue(
      of({
        message: 'Procesando',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 10,
      }),
    );
    observarProgresoImportacion.mockReturnValue(
      of(
        {
          tipo: 'progreso',
          datos: {
            filasProcesadas: 5,
            filasTotales: 10,
            porcentajeCompletado: 50,
          },
        } as const,
        {
          tipo: 'completada',
          datos: {
            filasProcesadas: 10,
            filasTotales: 10,
            porcentajeCompletado: 100,
          },
        } as const,
      ),
    );
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: media === '(prefers-reduced-motion: reduce)',
        media,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    fixture.detectChanges();

    const botonAbrir = fixture.nativeElement.querySelector(
      'button[aria-label="Importar socios"]',
    ) as HTMLButtonElement;
    botonAbrir.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('#socios-archivo') as HTMLInputElement;
    const archivo = new File(['contenido'], 'socios.xlsx');
    Object.defineProperty(input, 'files', { value: { 0: archivo, length: 1 } });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    const botonImportar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.trim() === 'Importar');
    botonImportar?.click();
    fixture.detectChanges();

    expect(iniciarImportacion).toHaveBeenCalledWith(archivo);
    expect(observarProgresoImportacion).toHaveBeenCalledWith(
      '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
    );
    expect(obtenerResultadoImportacion).toHaveBeenCalledWith(
      '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
    );
    expect(fixture.nativeElement.querySelector('#socios-archivo')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Finalizada');
    expect(fixture.nativeElement.textContent).toContain('Correctas');
    expect(fixture.nativeElement.textContent).toContain('Con error');
    expect(fixture.nativeElement.textContent).toContain('Advertencias');
    expect(fixture.nativeElement.textContent).toContain('Email duplicado en el archivo');
    expect(fixture.nativeElement.textContent).toContain('Se omitió la fila');
    expect(fixture.nativeElement.textContent).toContain('N.º de socio');
    expect(fixture.nativeElement.textContent).toContain('001');
    expect(fixture.nativeElement.textContent).not.toContain('no informa el resultado individual');
    expect(fixture.nativeElement.textContent).toContain('Cerrar');
    expect(fixture.nativeElement.textContent).not.toContain('MB');
    expect(paginar).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('socios.importacion.pendiente.company-1')).toBeNull();
  });

  it('conserva el avance mientras EventSource intenta reconectarse', async () => {
    const seguimiento = new Subject<{
      readonly tipo: 'progreso' | 'reconectando' | 'conectado';
      readonly datos?: {
        readonly filasProcesadas: number;
        readonly filasTotales: number;
        readonly porcentajeCompletado: number;
      };
    }>();
    iniciarImportacion.mockReturnValue(
      of({
        message: 'Procesando',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 10,
      }),
    );
    observarProgresoImportacion.mockReturnValue(seguimiento.asObservable());
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    await abrirImportacionYSeleccionarArchivo(fixture, new File(['contenido'], 'socios.xlsx'));
    buscarBotonPorTexto(fixture.nativeElement, 'Importar')?.click();
    seguimiento.next({
      tipo: 'progreso',
      datos: { filasProcesadas: 4, filasTotales: 10, porcentajeCompletado: 40 },
    });
    seguimiento.next({ tipo: 'reconectando' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Reconectando el seguimiento');
    expect(fixture.nativeElement.textContent).toContain('4/10 filas procesadas');
  });

  it('anima el porcentaje desde el último valor visible sin reiniciarlo', async () => {
    const seguimiento = new Subject<{
      readonly tipo: 'progreso';
      readonly datos: {
        readonly filasProcesadas: number;
        readonly filasTotales: number;
        readonly porcentajeCompletado: number;
      };
    }>();
    iniciarImportacion.mockReturnValue(
      of({
        message: 'Procesando',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 100,
      }),
    );
    observarProgresoImportacion.mockReturnValue(seguimiento.asObservable());

    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();
    await abrirImportacionYSeleccionarArchivo(fixture, new File(['contenido'], 'socios.xlsx'));
    buscarBotonPorTexto(fixture.nativeElement, 'Importar')?.click();

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => void 0);
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000);
    const completarFramesPendientes = (marcaTiempo: number): void => {
      const pendientes = frames.splice(0);
      pendientes.forEach((callback) => callback(marcaTiempo));
    };

    seguimiento.next({
      tipo: 'progreso',
      datos: { filasProcesadas: 50, filasTotales: 100, porcentajeCompletado: 50 },
    });
    completarFramesPendientes(1_700);
    fixture.detectChanges();

    const porcentaje = fixture.nativeElement.querySelector(
      '.gestion-socios__porcentaje-importacion',
    ) as HTMLElement;
    expect(porcentaje.textContent?.trim()).toBe('50%');

    seguimiento.next({
      tipo: 'progreso',
      datos: { filasProcesadas: 57, filasTotales: 100, porcentajeCompletado: 57 },
    });
    fixture.detectChanges();
    expect(porcentaje.textContent?.trim()).toBe('50%');

    completarFramesPendientes(1_250);
    fixture.detectChanges();
    expect(porcentaje.textContent?.trim()).toBe('57%');
    const barra = fixture.nativeElement.querySelector(
      '.gestion-socios__barra-progreso',
    ) as HTMLElement;
    const filasProcesadas = fixture.nativeElement.querySelector(
      '.gestion-socios__filas-procesadas',
    ) as HTMLElement;
    expect(filasProcesadas.textContent?.trim()).toBe('57/100 filas procesadas');
    expect(barra.compareDocumentPosition(filasProcesadas) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      barra.getAttribute('aria-valuenow'),
    ).toBe('57');
  });

  it('mantiene visible el progreso al 100% antes de mostrar el resultado final', async () => {
    const seguimiento = new Subject<{
      readonly tipo: 'progreso' | 'completada';
      readonly datos: {
        readonly filasProcesadas: number;
        readonly filasTotales: number;
        readonly porcentajeCompletado: number;
      };
    }>();
    iniciarImportacion.mockReturnValue(
      of({
        message: 'Procesando',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 100,
      }),
    );
    observarProgresoImportacion.mockReturnValue(seguimiento.asObservable());

    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();
    await abrirImportacionYSeleccionarArchivo(fixture, new File(['contenido'], 'socios.xlsx'));
    buscarBotonPorTexto(fixture.nativeElement, 'Importar')?.click();

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => void 0);
    vi.spyOn(window.performance, 'now').mockReturnValue(1_000);
    const completarFramesPendientes = (marcaTiempo: number): void => {
      const pendientes = frames.splice(0);
      pendientes.forEach((callback) => callback(marcaTiempo));
    };

    seguimiento.next({
      tipo: 'progreso',
      datos: { filasProcesadas: 95, filasTotales: 100, porcentajeCompletado: 95 },
    });
    completarFramesPendientes(1_700);

    seguimiento.next({
      tipo: 'completada',
      datos: { filasProcesadas: 100, filasTotales: 100, porcentajeCompletado: 100 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Procesando socios');
    expect(fixture.nativeElement.textContent).not.toContain('Finalizada');

    completarFramesPendientes(1_250);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Finalizada');
  });

  it('mantiene abierto el popup y muestra el userMessage si falla el POST', async () => {
    iniciarImportacion.mockReturnValue(
      throwError(() => ({ error: { userMessage: 'Faltan columnas obligatorias.' } })),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    await abrirImportacionYSeleccionarArchivo(fixture, new File(['contenido'], 'socios.xlsx'));
    buscarBotonPorTexto(fixture.nativeElement, 'Importar')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dialog[open]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Faltan columnas obligatorias.');
    expect(fixture.nativeElement.querySelector('#socios-archivo')).not.toBeNull();
    expect(observarProgresoImportacion).not.toHaveBeenCalled();
  });

  it('muestra un aborto de negocio con su avance y refresca el padrón', async () => {
    iniciarImportacion.mockReturnValue(
      of({
        message: 'Procesando',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 10,
      }),
    );
    observarProgresoImportacion.mockReturnValue(
      of({
        tipo: 'error',
        datos: {
          filasProcesadas: 3,
          filasTotales: 10,
          porcentajeCompletado: 30,
          errorMessage: 'La importación fue abortada.',
        },
      } as const),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    await abrirImportacionYSeleccionarArchivo(fixture, new File(['contenido'], 'socios.xlsx'));
    buscarBotonPorTexto(fixture.nativeElement, 'Importar')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La importación fue abortada.');
    expect(fixture.nativeElement.textContent).toContain('3 de 10 filas procesadas');
    expect(fixture.nativeElement.textContent).toContain('Cerrar');
    expect(paginar).toHaveBeenCalledTimes(2);
  });

  it('restaura una importación pendiente de la misma empresa y limpia la conexión al destruir', () => {
    const cerrarSeguimiento = vi.fn();
    observarProgresoImportacion.mockReturnValue(new Observable(() => cerrarSeguimiento));
    sessionStorage.setItem(
      'socios.importacion.pendiente.company-1',
      JSON.stringify({
        companyUuid: 'company-1',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 10,
      }),
    );

    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(observarProgresoImportacion).toHaveBeenCalledWith(
      '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
    );
    expect(fixture.nativeElement.querySelector('dialog[open]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('0/10 filas procesadas');

    fixture.destroy();
    expect(cerrarSeguimiento).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('socios.importacion.pendiente.company-1')).not.toBeNull();
  });

  it('descarta una importación persistida con datos inválidos o de otra empresa', () => {
    sessionStorage.setItem(
      'socios.importacion.pendiente.company-1',
      JSON.stringify({
        companyUuid: 'company-2',
        importId: 'valor-no-valido',
        filasTotales: -1,
      }),
    );

    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(observarProgresoImportacion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('dialog[open]')).toBeNull();
    expect(sessionStorage.getItem('socios.importacion.pendiente.company-1')).toBeNull();
  });

  it('no accede al seguimiento persistido durante el render SSR', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    sessionStorage.setItem(
      'socios.importacion.pendiente.company-1',
      JSON.stringify({
        companyUuid: 'company-1',
        importId: '3f1a9c2e-8b7d-4e6a-9c1a-2d4f5b6a7c8d',
        filasTotales: 10,
      }),
    );

    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(observarProgresoImportacion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('dialog[open]')).toBeNull();
  });

  it('mantiene la tabla visible si falla la carga del listado', () => {
    paginar.mockImplementationOnce(() =>
      throwError(() => new Error('No se pudieron cargar los socios.')),
    );
    const fixture = TestBed.createComponent(GestionSociosComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
    expect(fixture.nativeElement.querySelector('app-tabla-responsive')).not.toBeNull();
  });
  it('cierra el popup cuando falla el alta y deja el feedback al toast HTTP', async () => {
    const fixture = TestBed.createComponent(GestionSociosComponent);
    const sociosApi = TestBed.inject(SociosApiService);
    vi.mocked(sociosApi.crearTitular).mockReturnValue(
      throwError(() => new Error('El DNI ya esta registrado.')),
    );
    fixture.detectChanges();

    const botonNuevo = fixture.nativeElement.querySelector(
      'button[aria-label="Nuevo titular"]',
    ) as HTMLButtonElement;
    botonNuevo.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const completarCampo = (id: string, valor: string) => {
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    completarCampo('socio-nombre', 'Ana');
    completarCampo('socio-apellido', 'Perez');
    completarCampo('socio-email', 'ana@example.com');
    completarCampo('socio-password', 'secreto');

    const formulario = fixture.nativeElement.querySelector('#formulario-socio') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const popup = fixture.debugElement.query(By.directive(PopupComponent))
      .componentInstance as PopupComponent;
    expect(popup.abierto()).toBe(false);
  });
});
