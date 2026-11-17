import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CrearUsuarioInternoPayload } from '../../../../../core/api/interfaces/usuarios-internos.interfaces';
import { crearApiUrl } from '../../../../../core/api/api-url';
import { GestionUsuariosInternosComponent } from './gestion-usuarios-internos.component';

describe('GestionUsuariosInternosComponent', () => {
  let httpTesting: HttpTestingController;

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
    TestBed.configureTestingModule({
      imports: [GestionUsuariosInternosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  async function crearComponenteRecepcion() {
    const fixture = TestBed.createComponent(GestionUsuariosInternosComponent);
    fixture.componentRef.setInput('tipo', 'recepcionista');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    return fixture;
  }

  async function crearComponenteProfesor() {
    const fixture = TestBed.createComponent(GestionUsuariosInternosComponent);
    fixture.componentRef.setInput('tipo', 'profesor');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    return fixture;
  }

  function responderPaginaVacia(): void {
    const request = httpTesting.expectOne(crearApiUrl('recepcionista/paginate'));
    request.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    });
  }

  it('muestra la carga inicial de recepción dentro de la tabla y mantiene la paginación', async () => {
    const fixture = await crearComponenteRecepcion();

    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.gestion-usuarios__carga')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-paginacion')).not.toBeNull();

    const request = httpTesting.expectOne(crearApiUrl('recepcionista/paginate'));
    request.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });

  it('mantiene el spinner de Buscar y carga la tabla durante una búsqueda', async () => {
    const fixture = await crearComponenteRecepcion();
    responderPaginaVacia();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '#usuarios-internos-busqueda',
    ) as HTMLInputElement;
    input.value = 'Pérez';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('.gestion-usuarios__toolbar')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const request = httpTesting.expectOne(crearApiUrl('recepcionista/paginate'));
    expect(request.request.body.search).toBe('Pérez');
    expect(
      fixture.nativeElement
        .querySelector('.gestion-usuarios__boton-buscar button')
        ?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();

    request.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });

  it('carga la tabla y conserva la paginación al filtrar profesores por estado', async () => {
    const fixture = await crearComponenteProfesor();
    const inicial = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    inicial.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
    fixture.detectChanges();

    (
      fixture.componentInstance as unknown as {
        cambiarEstado(valor: string): void;
      }
    ).cambiarEstado('INACTIVO');
    fixture.detectChanges();

    const filtrado = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    expect(filtrado.request.body.estados).toEqual(['INACTIVO']);
    expect(
      fixture.nativeElement.querySelector(
        'app-tabla-responsive .tabla-responsive__cargando--reservado',
      ),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-paginacion')).not.toBeNull();

    filtrado.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });

  it('ordena busqueda, estado y boton en la barra de profesores', async () => {
    const fixture = await crearComponenteProfesor();
    const barra = fixture.nativeElement.querySelector(
      '.gestion-usuarios__toolbar--profesor',
    ) as HTMLElement;

    expect(barra.children[0].classList).toContain('gestion-usuarios__busqueda');
    expect(barra.children[1].tagName).toBe('APP-SELECT');
    expect(barra.children[2].classList).toContain('gestion-usuarios__boton-buscar');

    const request = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    request.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });

  it('consulta recepción sin enviar el filtro estados', async () => {
    const fixture = await crearComponenteRecepcion();

    const request = httpTesting.expectOne(crearApiUrl('recepcionista/paginate'));
    expect(request.request.body).toEqual({
      page: 1,
      size: 10,
      search: '',
    });
    expect(request.request.body).not.toHaveProperty('estados');
    request.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tabla-responsive__filtro-cabecera')).toBeNull();
  });

  it('conserva el filtro de estados para profesores', async () => {
    await crearComponenteProfesor();

    const request = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    expect(request.request.body).toEqual({
      page: 1,
      size: 10,
      search: '',
      estados: ['ACTIVO'],
    });
    request.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });

  it.each([
    ['recepcionista', 'recepcionista/paginate', 'r-1'],
    ['profesor', 'profesor/paginate', 'p-1'],
  ] as const)('muestra foto o iniciales en la tabla de %s', async (tipo, endpoint, uuid) => {
    const fixture = tipo === 'profesor'
      ? await crearComponenteProfesor()
      : await crearComponenteRecepcion();
    const listado = httpTesting.expectOne(crearApiUrl(endpoint));
    listado.flush({
      content: [
        {
          ...(tipo === 'profesor' ? { profesorUuid: uuid } : { recepcionistaUuid: uuid }),
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@example.com',
          imageUrl: 'https://cdn.example.com/ana.jpg',
          fechaNacimiento: '1990-01-15',
        },
        {
          ...(tipo === 'profesor' ? { profesorUuid: `${uuid}-2` } : { recepcionistaUuid: `${uuid}-2` }),
          nombre: 'Carlos',
          apellido: 'Ruiz',
          email: 'carlos@example.com',
          imageUrl: null,
          fechaNacimiento: [1992, 5, 3],
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 10,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 2,
      empty: false,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody img[src="https://cdn.example.com/ana.jpg"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.tabla-responsive__avatar-fallback')?.textContent?.trim()).toBe('CR');
    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((celda) => celda.textContent?.trim()))
      .toContain('Fecha de nacimiento');
    expect(fixture.nativeElement.querySelector('tbody')?.textContent).toContain('15/01/1990');
    expect(fixture.nativeElement.querySelector('tbody')?.textContent).toContain('03/05/1992');
  });

  it('actualiza una fila y recarga la página actual', async () => {
    const fixture = await crearComponenteRecepcion();
    const listado = httpTesting.expectOne(crearApiUrl('recepcionista/paginate'));
    listado.flush({
      content: [{ recepcionistaUuid: 'r-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', dni: '30123456', estado: 'INACTIVO' }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    });
    const componente = fixture.componentInstance as unknown as {
      manejarAccion(evento: { accion: string; fila: Record<string, unknown> }): void;
      guardar(resultado: { modo: 'editar'; datos: { nombre: string } }): void;
      formularioVisible(): boolean;
    };
    componente.manejarAccion({
      accion: 'editar',
      fila: { uuid: 'r-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', dni: '30123456', estado: 'INACTIVO' },
    });
    componente.guardar({ modo: 'editar', datos: { nombre: 'Ana María' } });

    const actualizacion = httpTesting.expectOne(crearApiUrl('recepcionista/uuid/r-1'));
    expect(actualizacion.request.method).toBe('PUT');
    expect(actualizacion.request.body).toEqual({ nombre: 'Ana María' });
    actualizacion.flush({ recepcionistaUuid: 'r-1', nombre: 'Ana María', apellido: 'Pérez', email: 'ana@example.com' });
    expect(componente.formularioVisible()).toBe(false);
    responderPaginaVacia();
  });

  it('mantiene abierto el formulario si falla la edición', async () => {
    const fixture = await crearComponenteRecepcion();
    responderPaginaVacia();
    const componente = fixture.componentInstance as unknown as {
      abrirEdicion(fila: Record<string, unknown>): void;
      guardar(resultado: { modo: 'editar'; datos: { nombre: string } }): void;
      formularioVisible(): boolean;
    };
    componente.abrirEdicion({
      uuid: 'r-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', dni: '30123456', estado: 'ACTIVO',
    });
    componente.guardar({ modo: 'editar', datos: { nombre: 'Ana María' } });

    const actualizacion = httpTesting.expectOne(crearApiUrl('recepcionista/uuid/r-1'));
    actualizacion.flush({ message: 'Email duplicado' }, { status: 400, statusText: 'Bad Request' });

    expect(componente.formularioVisible()).toBe(true);
  });

  it('agrega la fecha local actual al alta de recepción', async () => {
    const fixture = await crearComponenteRecepcion();
    responderPaginaVacia();
    const payload: CrearUsuarioInternoPayload = {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      password: 'secreto',
      dni: '30123456',
    };
    const hoy = new Date();
    const fechaEsperada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    (
      fixture.componentInstance as unknown as {
        crear(payloadCreacion: CrearUsuarioInternoPayload): void;
      }
    ).crear(payload);

    const alta = httpTesting.expectOne(crearApiUrl('recepcionista'));
    expect(alta.request.body).toEqual({ ...payload, fechaAlta: fechaEsperada });
    alta.flush({
      recepcionistaUuid: 'r-1',
      ...payload,
      fechaAlta: fechaEsperada,
      estado: 'ACTIVO',
    });
    responderPaginaVacia();
  });

  it('agrega la fecha local actual al alta de profesor y no muestra el input manual', async () => {
    const fixture = await crearComponenteProfesor();
    const listado = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    listado.flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
    const payload: CrearUsuarioInternoPayload = {
      nombre: 'Carlos',
      apellido: 'Ruiz',
      email: 'carlos@example.com',
      password: 'secreto',
      dni: '28123456',
    };
    const hoy = new Date();
    const fechaEsperada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    (
      fixture.componentInstance as unknown as {
        abrirFormulario(): void;
        crear(payloadCreacion: CrearUsuarioInternoPayload): void;
      }
    ).abrirFormulario();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-titulo-hero')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#usuario-interno-fecha-alta')).toBeNull();

    (
      fixture.componentInstance as unknown as {
        crear(payloadCreacion: CrearUsuarioInternoPayload): void;
      }
    ).crear(payload);

    const alta = httpTesting.expectOne(crearApiUrl('profesor'));
    expect(alta.request.body).toEqual({ ...payload, fechaAlta: fechaEsperada });
    alta.flush({
      profesorUuid: 'p-1',
      ...payload,
      fechaAlta: fechaEsperada,
      estado: 'ACTIVO',
    });
    httpTesting.expectOne(crearApiUrl('profesor/paginate')).flush({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    });
  });
});
