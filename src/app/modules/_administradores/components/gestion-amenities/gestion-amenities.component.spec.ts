import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AmenitiesApiService } from '../../../../core/api/services/amenities-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionAmenitiesComponent } from './gestion-amenities.component';

describe('GestionAmenitiesComponent', () => {
  it('muestra instalaciones sin acciones cuando no puede configurarlas', async () => {
    const fixture = await crearFixture();
    fixture.componentRef.setInput('puedeConfigurar', false);
    fixture.detectChanges();

    const tablaInstalaciones = fixture.nativeElement.querySelector('app-card app-tabla-responsive') as HTMLElement;

    expect(tablaInstalaciones).toBeTruthy();
    expect(tablaInstalaciones.querySelector('.tabla-responsive__toolbar-actions')).toBeNull();
    expect(tablaInstalaciones.querySelector('.tabla-responsive__acciones')).toBeNull();
  });

  it('convierte QR Base64 a una fuente de imagen segura y no duplica un data URL', async () => {
    const fixture = await crearFixture();
    const componente = fixture.componentInstance as unknown as {
      fuenteQr(qr: string): string;
    };

    expect(componente.fuenteQr('contenido-base64')).toBe('data:image/png;base64,contenido-base64');
    expect(componente.fuenteQr('data:image/png;base64,contenido-base64')).toBe(
      'data:image/png;base64,contenido-base64',
    );
  });
});

async function crearFixture(): Promise<ComponentFixture<GestionAmenitiesComponent>> {
  await TestBed.configureTestingModule({
    imports: [GestionAmenitiesComponent],
    providers: [
      {
        provide: AmenitiesApiService,
        useValue: {
          listar: () => of([]),
          paginarReservas: () => of({ content: [] }),
        },
      },
      { provide: ToastAlertService, useValue: { confirmDanger: () => Promise.resolve(false) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(GestionAmenitiesComponent);
  fixture.detectChanges();
  return fixture;
}
