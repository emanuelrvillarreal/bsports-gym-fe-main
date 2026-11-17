import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionDescuentosComponent } from './gestion-descuentos.component';

const paginaVacia = {
  content: [],
  totalPages: 0,
  totalElements: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: true,
  numberOfElements: 0,
  pageable: null,
  sort: null,
};

describe('GestionDescuentosComponent', () => {
  let fixture: ComponentFixture<GestionDescuentosComponent>;
  const descuentosApi = {
    paginarCatalogo: vi.fn(() => of(paginaVacia)),
    paginarPorSocio: vi.fn(() => of(paginaVacia)),
  };
  const actividadesApi = {
    paginar: vi.fn(() => of(paginaVacia)),
    paginarInscripciones: vi.fn(() => of(paginaVacia)),
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    await TestBed.configureTestingModule({
      imports: [GestionDescuentosComponent],
      providers: [
        { provide: DescuentosApiService, useValue: descuentosApi },
        { provide: ActividadesApiService, useValue: actividadesApi },
        { provide: ToastAlertService, useValue: { confirmDanger: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GestionDescuentosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('reutiliza tres tablas para separar catálogo, socios y actividades', () => {
    expect(fixture.nativeElement.querySelectorAll('app-tabla-responsive').length).toBe(3);
  });

  it('carga las tres fuentes principales al iniciar', () => {
    expect(descuentosApi.paginarCatalogo).toHaveBeenCalled();
    expect(descuentosApi.paginarPorSocio).toHaveBeenCalled();
    expect(actividadesApi.paginar).toHaveBeenCalled();
  });
});
