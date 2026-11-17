import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { PagoDetalleDto } from '../../../../core/api/interfaces/pagos.interfaces';
import { PagosApiService } from '../../../../core/api/services/pagos-api.service';
import { AppRole } from '../../../../core/auth/auth-role';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { PagoResultadoService } from '../../services/pago-resultado.service';
import { EstadoResultadoPago, ResultadoPagoPageComponent } from './resultado-pago-page.component';

describe('ResultadoPagoPageComponent', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  async function crearPagina(
    estado: EstadoResultadoPago,
    referenciaExterna: string | null = null,
    respuestaPago: Observable<PagoDetalleDto> = of({
      estado: 'APROBADO',
      montoTotal: 15000,
      paymentId: '173629676192',
      items: [],
    }),
    rol: AppRole | null = 'SOCIO_TITULAR',
  ): Promise<{
    fixture: ComponentFixture<ResultadoPagoPageComponent>;
    guardarReferenciaExterna: ReturnType<typeof vi.fn>;
    obtenerPorReferenciaExterna: ReturnType<typeof vi.fn>;
    rehidratarSesion: ReturnType<typeof vi.fn>;
    navigateByUrl: ReturnType<typeof vi.fn>;
  }> {
    const queryParamMap = convertToParamMap(
      referenciaExterna === null ? {} : { external_reference: referenciaExterna },
    );
    const guardarReferenciaExterna = vi.fn();
    const obtenerPorReferenciaExterna = vi.fn(() => respuestaPago);
    const rehidratarSesion = vi.fn(() => of(true));
    const obtenerRolUsuario = vi.fn(() => rol);
    const navigateByUrl = vi.fn(() => Promise.resolve(true));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResultadoPagoPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ estadoResultado: estado }),
            queryParamMap: of(queryParamMap),
            snapshot: { data: { estadoResultado: estado }, queryParamMap },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: PagoResultadoService, useValue: { guardarReferenciaExterna } },
        { provide: PagosApiService, useValue: { obtenerPorReferenciaExterna } },
        { provide: AuthService, useValue: { rehidratarSesion, obtenerRolUsuario } },
        {
          provide: PerformanceModeService,
          useValue: { desactivado: signal(true) },
        },
      ],
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(ResultadoPagoPageComponent);
    fixture.detectChanges();

    return {
      fixture,
      guardarReferenciaExterna,
      obtenerPorReferenciaExterna,
      rehidratarSesion,
      navigateByUrl,
    };
  }

  it('muestra el resultado exitoso y conserva una referencia externa opaca', async () => {
    const { fixture, guardarReferenciaExterna, obtenerPorReferenciaExterna, rehidratarSesion } =
      await crearPagina('exito', '  referencia-no-uuid  ');
    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('h1')?.textContent).toContain('Pago realizado con éxito');
    expect(elemento.querySelector('.resultado-pago--exito')).not.toBeNull();
    expect(elemento.querySelector('.resultado-pago__simbolo')?.getAttribute('d')).toContain(
      '35 62',
    );
    expect(guardarReferenciaExterna).toHaveBeenCalledWith('referencia-no-uuid');
    expect(obtenerPorReferenciaExterna).toHaveBeenCalledWith('referencia-no-uuid');
    expect(rehidratarSesion).toHaveBeenCalledOnce();
    expect(elemento.textContent).toContain('173629676192');
    expect(elemento.textContent).toContain('$15.000');
  });

  it('muestra el detalle del primer item como título del comprobante', async () => {
    const { fixture } = await crearPagina(
      'exito',
      'referencia-detalle',
      of({
        estado: 'APROBADO',
        montoTotal: 1,
        paymentId: 172874096507,
        detalle: null,
        items: [{ detalle: 'Cuota actividad inscripción x Agosto 2026' }],
      }),
    );

    expect(fixture.nativeElement.textContent).toContain(
      'Cuota actividad inscripción x Agosto 2026',
    );
    expect(fixture.nativeElement.textContent).toContain('$1');
  });

  it('usa el detalle general cuando ningún item tiene detalle', async () => {
    const { fixture } = await crearPagina(
      'exito',
      'referencia-detalle-general',
      of({
        estado: 'APROBADO',
        montoTotal: 1,
        paymentId: 172874096507,
        detalle: 'Pago general de cuota',
        items: [{ detalle: null }],
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('Pago general de cuota');
  });

  it('muestra el resultado de error con una X', async () => {
    const { fixture } = await crearPagina('error');
    const elemento: HTMLElement = fixture.nativeElement;

    expect(elemento.querySelector('h1')?.textContent).toContain('No pudimos procesar el pago');
    expect(elemento.querySelector('.resultado-pago--error')).not.toBeNull();
    expect(elemento.querySelector('.resultado-pago__simbolo')?.getAttribute('d')).toContain(
      '40 40 80 80',
    );
  });

  it('ignora una referencia externa vacía', async () => {
    const { guardarReferenciaExterna, obtenerPorReferenciaExterna } = await crearPagina(
      'error',
      '   ',
    );

    expect(guardarReferenciaExterna).not.toHaveBeenCalled();
    expect(obtenerPorReferenciaExterna).not.toHaveBeenCalled();
  });

  it('informa cuando falta la referencia en el retorno exitoso', async () => {
    const { fixture, obtenerPorReferenciaExterna } = await crearPagina('exito');

    expect(obtenerPorReferenciaExterna).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'No recibimos la referencia necesaria para consultar el comprobante.',
    );
  });

  it('mantiene la página operativa cuando falla la consulta del comprobante', async () => {
    const { fixture } = await crearPagina(
      'exito',
      'referencia-404',
      throwError(() => new Error('Pago no encontrado')),
    );

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar los datos del comprobante.',
    );
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('informa que el comprobante sigue en confirmación cuando el pago está pendiente', async () => {
    const { fixture } = await crearPagina(
      'exito',
      'referencia-pendiente',
      of({ estado: 'PENDIENTE', montoTotal: 15000, items: [] }),
    );

    expect(fixture.nativeElement.textContent).toContain('Estamos confirmando el pago.');
    expect(fixture.nativeElement.textContent).not.toContain('Número de comprobante');
  });

  it.each([
    ['SOCIO_TITULAR', '/socio-titular/cuotas', 'Volver a mis cuotas'],
    ['ADMIN', '/admin/tesoreria/ingresos', 'Volver a ingresos'],
    ['ADM_RECEPCION', '/adm-recepcion/tesoreria/ingresos', 'Volver a ingresos'],
  ] satisfies [AppRole, string, string][])(
    'vuelve al destino correspondiente para %s',
    async (rol, ruta, textoBoton) => {
      const { fixture, navigateByUrl } = await crearPagina('exito', null, undefined, rol);
      const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button');

      expect(boton.textContent).toContain(textoBoton);
      boton.click();

      expect(navigateByUrl).toHaveBeenCalledWith(ruta);
    },
  );

  it('mantiene cuotas como destino seguro cuando no hay un rol activo', async () => {
    const { fixture, navigateByUrl } = await crearPagina('error', null, undefined, null);
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(boton.textContent).toContain('Volver a mis cuotas');
    boton.click();

    expect(navigateByUrl).toHaveBeenCalledWith('/socio-titular/cuotas');
  });
});
