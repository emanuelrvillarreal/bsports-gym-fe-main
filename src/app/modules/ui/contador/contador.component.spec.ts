import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccesosClubApiService } from '../../../core/api/services/accesos-club-api.service';
import { AccesoClubLiveEvent } from '../../../core/api/interfaces/accesos-club.interfaces';
import { AuthService } from '../../../core/global-services/services/auth.service';
import { ContadorComponent } from './contador.component';

describe('ContadorComponent', () => {
  const listarPresentes = vi.fn(() => of({ presentes: [], count: 7 }));
  let eventosLive: Subject<AccesoClubLiveEvent>;
  let rolActivo: string | null;

  beforeEach(() => {
    rolActivo = 'ADMIN';
    listarPresentes.mockClear();
    eventosLive = new Subject<AccesoClubLiveEvent>();
    TestBed.configureTestingModule({
      imports: [ContadorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AccesosClubApiService,
          useValue: { listarPresentes, observarEnVivo: () => eventosLive },
        },
        { provide: AuthService, useValue: { obtenerRolUsuario: () => rolActivo } },
      ],
    });
  });

  it('muestra el count recibido y aplica el estado verde para valores entre 6 y 9', () => {
    const fixture = TestBed.createComponent(ContadorComponent);
    fixture.detectChanges();

    const contador = fixture.nativeElement.querySelector('.contador') as HTMLElement;
    expect(contador.textContent).toContain('7');
    expect(contador.classList).toContain('contador--medio');
  });

  it('no se muestra ni consulta presentes para un rol no habilitado', () => {
    rolActivo = 'PROFESOR';
    const fixture = TestBed.createComponent(ContadorComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.contador')).toBeNull();
    expect(listarPresentes).not.toHaveBeenCalled();
  });

  it('actualiza el valor directamente con el evento live', () => {
    const fixture = TestBed.createComponent(ContadorComponent);
    fixture.detectChanges();

    eventosLive.next({
      item: { userUuid: 'user-1', tipo: 'INGRESO', presente: true },
      presenteCount: 11,
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('11');
  });
});
