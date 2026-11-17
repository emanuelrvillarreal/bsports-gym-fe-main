import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { GestionReservaAmenityComponent } from './gestion-reserva-amenity.component';

const socio: SocioDto = {
  memberUuid: 'socio-1',
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@example.com',
  estado: 'ACTIVO',
  titular: true,
};

describe('GestionReservaAmenityComponent', () => {
  let fixture: ComponentFixture<GestionReservaAmenityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionReservaAmenityComponent],
      providers: [
        {
          provide: SociosApiService,
          useValue: {
            paginar: () => of({ content: [socio], totalPages: 1 }),
          },
        },
        { provide: ThemeModeService, useValue: { resolvedMode: signal<'dark' | 'light'>('dark') } },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#4982fd'),
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionReservaAmenityComponent);
    fixture.detectChanges();
  });

  it('reutiliza wizard-pasos y conserva la API numérica del flujo', () => {
    let activo = (fixture.nativeElement as HTMLElement).querySelector('[aria-current="step"]');
    expect(activo?.textContent).toContain('Socio');
    expect(fixture.componentInstance.pasoActual()).toBe(1);

    fixture.componentInstance['manejarAccionSocio']({ accion: 'seleccionar', fila: socio });
    fixture.detectChanges();

    activo = (fixture.nativeElement as HTMLElement).querySelector('[aria-current="step"]');
    expect(activo?.textContent).toContain('Instalación');
    expect(fixture.componentInstance.pasoActual()).toBe(2);
  });

  it('muestra las horas del backend en formato de 24 horas', () => {
    const formatear = fixture.componentInstance['formatearHora24'];

    expect(formatear('17:00:00')).toBe('17:00');
    expect(formatear('08:30:00')).toBe('08:30');
  });
});
