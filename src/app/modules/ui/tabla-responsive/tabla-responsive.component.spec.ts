import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { ColorThemeService } from '../color-mod/color-theme.service';
import {
  AccionTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from './tabla-responsive.component';

interface FilaPrueba {
  readonly uid: string;
  readonly nombre: string;
  readonly estado?: string;
  readonly bloqueada?: boolean;
}

describe('TablaResponsiveComponent: acciones', () => {
  const fila: FilaPrueba = { uid: 'fila-1', nombre: 'Ana' };
  const temaResuelto = signal<'dark' | 'light'>('dark');
  const colorPrimario = signal('#f5f5f5');

  const crearFixture = (): ComponentFixture<TablaResponsiveComponent<FilaPrueba>> =>
    TestBed.createComponent(TablaResponsiveComponent) as unknown as ComponentFixture<
      TablaResponsiveComponent<FilaPrueba>
    >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaResponsiveComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: temaResuelto },
        },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario,
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();
  });

  it('renderiza los presets en el orden recibido con etiquetas accesibles', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', [
      'agregar',
      'borrar',
      'editar',
      'ver',
      'inscribir',
    ] satisfies readonly AccionTabla<FilaPrueba>[]);
    // Con lugar para todas, se muestran como botones en el orden recibido.
    fixture.componentRef.setInput('maxAccionesVisibles', 5);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const etiquetas = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('.tabla-responsive__acciones-botones button'),
      (boton) => boton.getAttribute('aria-label'),
    );

    expect(etiquetas).toEqual(['Agregar', 'Borrar', 'Editar', 'Ver', 'Inscribir']);
  });

  it('emite la accion y la fila seleccionada', () => {
    const fixture = crearFixture();
    const eventos: EventoAccionTabla<FilaPrueba>[] = [];
    fixture.componentInstance.accionFila.subscribe((evento) => eventos.push(evento));
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', ['editar']);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento
      .querySelector<HTMLButtonElement>('.tabla-responsive__acciones-botones button')
      ?.click();

    expect(eventos).toEqual([{ accion: 'editar', fila }]);
  });

  it('mantiene verFila al usar el preset ver', () => {
    const fixture = crearFixture();
    const filasVistas: FilaPrueba[] = [];
    fixture.componentInstance.verFila.subscribe((filaVista) => filasVistas.push(filaVista));
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', ['ver']);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento
      .querySelector<HTMLButtonElement>('.tabla-responsive__acciones-botones button')
      ?.click();

    expect(filasVistas).toEqual([fila]);
  });

  it('usa el preset iconografico ver como fallback', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.tabla-responsive__acciones-botones button',
    );

    expect(boton?.getAttribute('aria-label')).toBe('Ver');
  });

  it('admite una accion personalizada con color y estado por fila', () => {
    const fixture = crearFixture();
    const acciones: readonly AccionTabla<FilaPrueba>[] = [
      {
        id: 'auditar',
        texto: 'Auditar',
        icono: 'heroClock',
        color: (filaActual) => filaActual.uid === fila.uid
          ? 'var(--semantic-info)'
          : 'var(--app-text-soft)',
        deshabilitada: (filaActual) => filaActual.uid === fila.uid,
      },
    ];
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', acciones);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const hostBoton = elemento.querySelector<HTMLElement>('.tabla-responsive__action-btn--custom');
    const boton = hostBoton?.querySelector<HTMLButtonElement>('button');

    expect(hostBoton?.dataset['actionText']).toBe('Auditar');
    expect(hostBoton?.style.getPropertyValue('--tabla-action-custom-hue')).toBe(
      'var(--semantic-info)',
    );
    expect(boton?.disabled).toBe(true);
  });

  it('permite personalizar el titulo de la columna de acciones', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('tituloAcciones', 'Seleccionar');
    fixture.detectChanges();

    const encabezado = (fixture.nativeElement as HTMLElement).querySelector(
      '.tabla-responsive__acciones-titulo',
    );

    expect(encabezado?.textContent?.trim()).toBe('Seleccionar');
  });

  it('permite aplicar una clase semántica por fila', () => {
    const fixture = crearFixture();
    const inactiva: FilaPrueba = { uid: 'fila-inactiva', nombre: 'Luis', estado: 'INACTIVO' };
    fixture.componentRef.setInput('columnas', [
      { id: 'nombre', titulo: 'Nombre' },
      { id: 'estado', titulo: 'Estado', tipo: 'estado' },
    ]);
    fixture.componentRef.setInput('filas', [inactiva]);
    fixture.componentRef.setInput('filaClase', (filaActual: FilaPrueba) =>
      filaActual.estado === 'INACTIVO' ? 'tabla-responsive__fila--peligro' : null,
    );
    fixture.detectChanges();

    const filaRenderizada = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');
    const estado = filaRenderizada?.querySelector('.tabla-responsive__estado');

    expect(filaRenderizada?.classList).toContain('tabla-responsive__fila--peligro');
    expect(estado?.classList).toContain('tabla-responsive__estado--inactivo');
  });

  it('permite configurar visibilidad y carga en un preset', () => {
    const fixture = crearFixture();
    const acciones: readonly AccionTabla<FilaPrueba>[] = [
      { predefinida: 'editar', visible: false },
      { predefinida: 'borrar', cargando: true },
    ];
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', acciones);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const botones = elemento.querySelectorAll<HTMLButtonElement>(
      '.tabla-responsive__acciones-botones button',
    );

    expect(botones).toHaveLength(1);
    expect(botones[0].disabled).toBe(true);
    expect(botones[0].getAttribute('aria-busy')).toBe('true');
  });

  it('renderiza y emite acciones adicionales de cabecera', () => {
    const fixture = crearFixture();
    const acciones: string[] = [];
    fixture.componentInstance.accionCabecera.subscribe((accion) => acciones.push(accion));
    fixture.componentRef.setInput('accionesCabecera', [
      { id: 'importar', texto: 'Importar socios', abreDialogo: true },
    ]);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Importar socios"]',
    );
    boton?.click();

    expect(boton?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(acciones).toEqual(['importar']);
  });

  it('adapta el simbolo mas al contraste del color primario', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('accionesCabecera', [
      { id: 'nuevo', texto: 'Nuevo registro' },
    ]);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      'app-boton.tabla-responsive__add-button',
    );

    expect(boton?.style.getPropertyValue('--app-boton-color-fondo')).toBe('#f5f5f5');
    expect(boton?.style.getPropertyValue('--app-boton-color-texto')).toBe('#000000');
  });

  it('renderiza el tooltip dentro del dialogo modal que contiene la tabla', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('mostrarAcciones', false);
    fixture.detectChanges();

    const dialogo = document.createElement('dialog');
    dialogo.setAttribute('open', '');
    document.body.appendChild(dialogo);
    dialogo.appendChild(fixture.nativeElement);

    const celda = dialogo.querySelector<HTMLElement>('.tabla-responsive__celda-contenido');
    celda?.click();

    const tooltip = dialogo.querySelector<HTMLElement>('[role="tooltip"]');
    expect(tooltip?.parentElement).toBe(dialogo);
    expect(tooltip?.textContent).toContain('Ana');

    dialogo.remove();
  });

  it('cierra tooltips de celdas y acciones al hacer scroll en un contenedor interno', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('acciones', ['editar']);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLElement>('.tabla-responsive__celda-contenido')?.click();
    elemento
      .querySelector<HTMLElement>('.tabla-responsive__action-btn')
      ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull();
    expect(
      document.body.querySelector('.tabla-responsive__action-tooltip-flotante'),
    ).not.toBeNull();

    elemento
      .querySelector<HTMLElement>('.tabla-responsive__table-wrap')
      ?.dispatchEvent(new Event('scroll'));

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(
      document.body.querySelector('.tabla-responsive__action-tooltip-flotante'),
    ).toBeNull();
  });

  it('mantiene el alto reservado al alternar entre carga y estado vacio', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', []);
    fixture.componentRef.setInput('tbody_rows', 6);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('app-load-spinner-blue')).not.toBeNull();
    expect(elemento.querySelector('.tabla-responsive__cargando--reservado')).not.toBeNull();
    expect(elemento.querySelector('.tabla-responsive__vacio')).toBeNull();

    fixture.componentRef.setInput('cargando', false);
    fixture.detectChanges();

    expect(elemento.querySelector('app-load-spinner-blue')).toBeNull();
    expect(elemento.querySelector('.tabla-responsive__vacio--reservado')).not.toBeNull();

    fixture.componentRef.setInput('filas', [fila]);
    fixture.detectChanges();

    const tabla = elemento.querySelector<HTMLElement>('.tabla-responsive');
    expect(tabla?.classList).toContain('tabla-responsive--filas-limitadas');
    expect(tabla?.style.getPropertyValue('--tabla-max-filas')).toBe('6');
    expect(elemento.querySelector('.tabla-responsive__table-wrap')).not.toBeNull();
  });

  it('navega las cards responsive y actualiza el contador', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [
      fila,
      { uid: 'fila-2', nombre: 'Luis' },
    ]);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;

    const anterior = elemento.querySelector<HTMLButtonElement>(
      'button[aria-label="Ver registro anterior"]',
    );
    const siguiente = elemento.querySelector<HTMLButtonElement>(
      'button[aria-label="Ver registro siguiente"]',
    );

    expect(elemento.querySelector('.tabla-responsive__carousel-counter')?.textContent?.trim())
      .toBe('1 de 2');
    expect(anterior?.disabled).toBe(true);
    expect(siguiente?.disabled).toBe(false);

    siguiente?.click();
    fixture.detectChanges();

    expect(elemento.querySelector('.tabla-responsive__carousel-counter')?.textContent?.trim())
      .toBe('2 de 2');
    expect(anterior?.disabled).toBe(false);
    expect(siguiente?.disabled).toBe(true);
  });

  it('incluye tr_input como card editable en el carrusel', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [fila]);
    fixture.componentRef.setInput('tr_input', true);
    fixture.componentRef.setInput('tr_input_visible_inicial', true);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const filas = elemento.querySelectorAll('tbody > tr');

    expect(filas).toHaveLength(2);
    expect(filas[0].classList).toContain('tabla-responsive__fila-input');
    expect(filas[0].querySelector('input[aria-label="Nombre"]')).not.toBeNull();
    expect(elemento.querySelector('.tabla-responsive__carousel-counter')?.textContent?.trim())
      .toBe('1 de 2');
  });

  it('muestra la carga en Confirmar y evita reenviar el formulario inline', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('tr_input', true);
    fixture.componentRef.setInput('tr_input_visible_inicial', true);
    fixture.componentRef.setInput('tr_input_cargando', true);
    const emit = vi.spyOn(fixture.componentInstance.trInputSubmit, 'emit');
    fixture.detectChanges();

    const confirmar = fixture.nativeElement.querySelector(
      'button[aria-label="Guardando registro"]',
    ) as HTMLButtonElement;
    expect(confirmar).not.toBeNull();
    expect(confirmar.getAttribute('aria-busy')).toBe('true');

    confirmar.click();
    expect(emit).not.toHaveBeenCalled();
  });

  it('limita un drag extenso a una sola card', () => {
    const fixture = crearFixture();
    fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
    fixture.componentRef.setInput('filas', [
      fila,
      { uid: 'fila-2', nombre: 'Luis' },
      { uid: 'fila-3', nombre: 'Marta' },
    ]);
    fixture.detectChanges();

    const componenteInterno = fixture.componentInstance as unknown as {
      esVistaCards: () => boolean;
    };
    componenteInterno.esVistaCards = () => true;

    const carril = (fixture.nativeElement as HTMLElement).querySelector('tbody');
    const emitirPointer = (tipo: string, clientX: number): void => {
      const evento = new MouseEvent(tipo, { bubbles: true, button: 0, clientX });
      Object.defineProperties(evento, {
        pointerId: { value: 1 },
        isPrimary: { value: true },
      });
      carril?.dispatchEvent(evento);
    };

    emitirPointer('pointerdown', 320);
    emitirPointer('pointermove', 20);
    emitirPointer('pointerup', 20);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.tabla-responsive__carousel-counter')
        ?.textContent?.trim(),
    ).toBe('2 de 3');
  });


  describe('menú ⋯ de acciones', () => {
    const accionesSocio: readonly AccionTabla<FilaPrueba>[] = [
      'editar',
      { id: 'familiar', texto: 'Agregar familiar', icono: 'heroUserPlus', color: 'var(--semantic-success)' },
      { id: 'baja', texto: 'Dar de baja', icono: 'heroTrash', color: 'var(--semantic-danger)' },
      { id: 'certificados', texto: 'Ver certificados', icono: 'heroDocumentText', color: 'var(--app-accent)' },
    ];

    function crearConMenu(acciones = accionesSocio) {
      const fixture = crearFixture();
      fixture.componentRef.setInput('columnas', [{ id: 'nombre', titulo: 'Nombre' }]);
      fixture.componentRef.setInput('filas', [fila]);
      fixture.componentRef.setInput('acciones', acciones);
      fixture.detectChanges();
      return fixture;
    }

    function abrirMenu(fixture: ReturnType<typeof crearConMenu>): HTMLElement {
      const elemento = fixture.nativeElement as HTMLElement;
      elemento.querySelector<HTMLButtonElement>('button[aria-label="Más acciones"]')!.click();
      fixture.detectChanges();
      return elemento.querySelector<HTMLElement>('.tabla-responsive__menu-acciones')!;
    }

    it('deja a la vista la principal y agrupa el resto en el menú', () => {
      const fixture = crearConMenu();
      const elemento = fixture.nativeElement as HTMLElement;

      const enLinea = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('.tabla-responsive__acciones-botones button'),
        (boton) => boton.getAttribute('aria-label'),
      );

      expect(enLinea).toEqual(['Editar', 'Más acciones']);
    });

    it('lista las destructivas al final y separadas', () => {
      const fixture = crearConMenu();
      const menu = abrirMenu(fixture);

      const items = Array.from(menu.querySelectorAll('[role="menuitem"]'), (item) =>
        item.textContent?.trim(),
      );

      expect(items).toEqual(['Agregar familiar', 'Ver certificados', 'Dar de baja']);
      expect(menu.querySelector('[role="separator"]')).not.toBeNull();
      expect(menu.querySelector('.tabla-responsive__menu-item--destructiva')?.textContent).toContain(
        'Dar de baja',
      );
    });

    it('respeta la acción marcada como principal', () => {
      const fixture = crearConMenu([
        'editar',
        'ver',
        { id: 'cobrar', texto: 'Cobrar', icono: 'heroBanknotes', color: 'var(--app-accent)', principal: true },
      ]);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(
        elemento.querySelector('.tabla-responsive__acciones-botones button')?.getAttribute('aria-label'),
      ).toBe('Cobrar');
    });

    it('emite la acción elegida en el menú y lo cierra', () => {
      const fixture = crearConMenu();
      const eventos: EventoAccionTabla<FilaPrueba>[] = [];
      fixture.componentInstance.accionFila.subscribe((evento) => eventos.push(evento));
      const menu = abrirMenu(fixture);

      Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
        .find((item) => item.textContent?.includes('Ver certificados'))!
        .click();
      fixture.detectChanges();

      expect(eventos).toEqual([{ accion: 'certificados', fila }]);
      expect((fixture.nativeElement as HTMLElement).querySelector('.tabla-responsive__menu-acciones')).toBeNull();
    });

    it('se cierra con Escape y devuelve el foco al botón ⋯', () => {
      const fixture = crearConMenu();
      const menu = abrirMenu(fixture);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.tabla-responsive__menu-acciones')).toBeNull();
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Más acciones');
    });

    it('no usa menú cuando las acciones entran como botones', () => {
      const fixture = crearConMenu(['editar', 'ver']);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('button[aria-label="Más acciones"]')).toBeNull();
    });
  });
});
