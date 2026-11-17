import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { SolicitudesRegistroComponent } from './solicitudes-registro.component';

interface ComponenteSolicitudesPrueba {
  prepararAprobacion: (solicitud: {
    readonly memberUuid: string;
    readonly nombre: string;
    readonly apellido: string;
    readonly titularNombre: null;
    readonly email: string;
  }) => void;
  agregarDescuentoAprobacion: (payload: {
    readonly descuentoUuid: string;
    readonly fechaDesde: string;
    readonly fechaHasta: string | null;
  }) => void;
  confirmarAprobacion: () => void;
  descuentosAprobacion: () => readonly unknown[];
  errorAprobacion: () => string;
}

describe('SolicitudesRegistroComponent', () => {
  const solicitud = {
    memberUuid: 'member-1',
    nombre: 'Ana',
    apellido: 'Pérez',
    titularNombre: null,
    email: 'ana@example.com',
  };
  const sociosApi = {
    listarSolicitudes: vi.fn(),
    aprobarSolicitud: vi.fn(),
    rechazarSolicitud: vi.fn(),
  };
  const descuentosApi = {
    paginarCatalogo: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    sociosApi.listarSolicitudes.mockReturnValue(of({ content: [solicitud], totalPages: 1 }));
    sociosApi.aprobarSolicitud.mockReturnValue(of(void 0));
    descuentosApi.paginarCatalogo.mockReturnValue(
      of({
        content: [
          {
            descuentoUuid: 'descuento-1',
            titulo: 'Convenio',
            tipoValor: 'PORCENTAJE',
            porcentaje: 10,
            montoFijo: null,
          },
        ],
        totalPages: 1,
      }),
    );
    TestBed.configureTestingModule({
      imports: [SolicitudesRegistroComponent],
      providers: [
        { provide: SociosApiService, useValue: sociosApi },
        { provide: DescuentosApiService, useValue: descuentosApi },
        { provide: ToastAlertService, useValue: { confirmDanger: vi.fn() } },
      ],
    });
  });

  it('conserva la aprobación sin descuentos', () => {
    const componente = crearComponente();

    componente.prepararAprobacion(solicitud);
    componente.confirmarAprobacion();

    expect(sociosApi.aprobarSolicitud).toHaveBeenCalledWith('member-1', {});
  });

  it('envía cero o más descuentos con sus fechas en el body de aprobación', () => {
    const componente = crearComponente();
    const asignacion = {
      descuentoUuid: 'descuento-1',
      fechaDesde: '2026-09-01',
      fechaHasta: null,
    } as const;

    componente.prepararAprobacion(solicitud);
    componente.agregarDescuentoAprobacion(asignacion);
    componente.confirmarAprobacion();

    expect(sociosApi.aprobarSolicitud).toHaveBeenCalledWith('member-1', {
      descuentos: [asignacion],
    });
  });

  it('evita agregar dos veces el mismo descuento', () => {
    const componente = crearComponente();
    const asignacion = {
      descuentoUuid: 'descuento-1',
      fechaDesde: '2026-09-01',
      fechaHasta: null,
    } as const;

    componente.prepararAprobacion(solicitud);
    componente.agregarDescuentoAprobacion(asignacion);
    componente.agregarDescuentoAprobacion({ ...asignacion, fechaDesde: '2026-10-01' });

    expect(componente.descuentosAprobacion()).toEqual([asignacion]);
    expect(componente.errorAprobacion()).toBe('Ese descuento ya fue agregado.');
  });

  function crearComponente(): ComponenteSolicitudesPrueba {
    return TestBed.createComponent(SolicitudesRegistroComponent)
      .componentInstance as unknown as ComponenteSolicitudesPrueba;
  }
});
