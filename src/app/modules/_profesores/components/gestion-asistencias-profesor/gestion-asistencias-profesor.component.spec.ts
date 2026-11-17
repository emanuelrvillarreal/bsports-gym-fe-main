import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GestionAsistenciasProfesorComponent } from './gestion-asistencias-profesor.component';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { AsistenciaProfesorItemDto } from '../../../../core/api/interfaces/actividades.interfaces';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';

describe('GestionAsistenciasProfesorComponent', () => {
  const consultarCalendario = vi.fn(() => of([]));
  const paginarAsistencias = vi.fn(() => of({ content: [], totalPages: 1 }));
  const obtenerPlanillaAsistencia = vi.fn(() => of([] as readonly AsistenciaProfesorItemDto[]));
  const guardarAsistencia = vi.fn(() => of({}));

  beforeEach(async () => {
    vi.clearAllMocks();
    consultarCalendario.mockReturnValue(of([]));
    paginarAsistencias.mockReturnValue(of({ content: [], totalPages: 1 }));
    await TestBed.configureTestingModule({
      imports: [GestionAsistenciasProfesorComponent],
      providers: [
        { provide: PortalProfesorApiService, useValue: { consultarCalendario, paginarAsistencias, obtenerPlanillaAsistencia, guardarAsistencia } },
        { provide: ColorThemeService, useValue: { colorPrimario: signal('#111111'), colorSecundario: signal('#222222') } },
        { provide: ThemeModeService, useValue: { resolvedMode: signal<'light' | 'dark'>('light') } },
      ],
    }).compileComponents();
  });

  function crear(): ComponentFixture<GestionAsistenciasProfesorComponent> {
    const fixture = TestBed.createComponent(GestionAsistenciasProfesorComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('consulta hoy y descarta slots sin uuid, amenities y duplicados', async () => {
    consultarCalendario.mockReturnValue(of([
      { slotUuid: null, tipo: 'ACTIVIDAD', referenciaUuid: 'a', inicio: '01/09/2026 09:00:00', fin: '01/09/2026 10:00:00' },
      { slotUuid: 's2', tipo: 'AMENITY', referenciaUuid: 'a', inicio: '01/09/2026 08:00:00', fin: '01/09/2026 09:00:00' },
      { slotUuid: 's2', tipo: 'ACTIVIDAD', referenciaUuid: 'a', inicio: '01/09/2026 11:00:00', fin: '01/09/2026 12:00:00' },
      { slotUuid: 's1', tipo: 'ACTIVIDAD', referenciaUuid: 'a', inicio: '01/09/2026 08:00:00', fin: '01/09/2026 09:00:00' },
    ] as any));
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    expect(consultarCalendario).toHaveBeenCalledWith(expect.objectContaining({ desde: expect.any(String), hasta: expect.any(String) }));
    expect(componente.cards().map((card: { slotUuid: string }) => card.slotUuid)).toEqual(['s1', 's2']);
  });

  it('alterna la paleta de los botones de asistencia por card', async () => {
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    componente.cards.set([
      { slotUuid: 's1', tipo: 'ACTIVIDAD', referenciaUuid: 'a1', inicio: '01/09/2026 08:00:00', fin: '01/09/2026 09:00:00' },
      { slotUuid: 's2', tipo: 'ACTIVIDAD', referenciaUuid: 'a2', inicio: '01/09/2026 09:00:00', fin: '01/09/2026 10:00:00' },
      { slotUuid: 's3', tipo: 'ACTIVIDAD', referenciaUuid: 'a3', inicio: '01/09/2026 10:00:00', fin: '01/09/2026 11:00:00' },
    ]);

    expect(componente.cards().map((card: any) => componente.colorPaletaAsistencia(card))).toEqual([
      'primario',
      'secundario',
      'primario',
    ]);
  });

  it('envía historial con size cinco para la actividad seleccionada', async () => {
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    componente.cards.set([{ slotUuid: 'slot-1', tipo: 'ACTIVIDAD', referenciaUuid: 'actividad-1', inicio: '01/09/2026 09:00:00', fin: '01/09/2026 10:00:00' }]);
    componente.actividadHistorialUuid.set('slot-1');
    componente.cargarHistorial();
    expect(paginarAsistencias).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      size: 70,
      actividadUuid: 'actividad-1',
      fechaDesde: expect.any(String),
      fechaHasta: expect.any(String),
    }));
    const payload = (paginarAsistencias.mock.calls[paginarAsistencias.mock.calls.length - 1] as unknown as [Record<string, unknown>])[0];
    expect(payload).not.toHaveProperty('desde');
    expect(payload).not.toHaveProperty('hasta');
  });

  it('envía solo los alumnos con estado declarado al guardar', async () => {
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    componente.cardSeleccionada.set({ slotUuid: 'slot-1', referenciaUuid: 'actividad-1' });
    componente.alumnos.set([
      { memberUuid: 'm1', nombre: 'Ana', apellido: 'Pérez', estado: 'PRESENTE' },
      { memberUuid: 'm2', nombre: 'Luis', apellido: 'Gómez', estado: null },
    ]);
    componente.guardar();
    expect(guardarAsistencia).toHaveBeenCalledWith('slot-1', { items: [{ memberUuid: 'm1', estado: 'PRESENTE' }] });
  });

  it('cierra el popup cuando el guardado termina correctamente', async () => {
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    componente.cardSeleccionada.set({ slotUuid: 'slot-1', referenciaUuid: 'actividad-1' });
    componente.alumnos.set([
      { memberUuid: 'm1', nombre: 'Ana', apellido: 'Perez', estado: 'PRESENTE' },
    ]);
    componente.popupAbierto.set(true);

    componente.guardar();

    expect(componente.popupAbierto()).toBe(false);
  });

  it('conserva los alumnos ya declarados al abrir nuevamente una card', async () => {
    obtenerPlanillaAsistencia.mockReturnValue(
      of([
        { memberUuid: 'm1', nombre: 'Leonel', apellido: 'Messi', estado: 'PRESENTE' },
        { memberUuid: 'm2', nombre: 'Alejandro', apellido: 'Acosta', estado: 'AUSENTE' },
      ]),
    );
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    const card = { slotUuid: 'slot-1', referenciaUuid: 'actividad-1' };

    componente.abrirAsistencia(card);
    fixture.detectChanges();

    expect(obtenerPlanillaAsistencia).toHaveBeenCalledWith('slot-1');
    expect(componente.alumnos()).toEqual([
      { memberUuid: 'm1', nombre: 'Leonel', apellido: 'Messi', estado: 'PRESENTE' },
      { memberUuid: 'm2', nombre: 'Alejandro', apellido: 'Acosta', estado: 'AUSENTE' },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Leonel');
    expect(fixture.nativeElement.textContent).toContain('Alejandro');
  });

  it('resuelve el estado del historial cuando la tabla invoca el callback sin contexto', async () => {
    const fixture = crear();
    await Promise.resolve();
    const componente = fixture.componentInstance as any;
    const resolverEstado = componente.estadoHistorial;

    expect(resolverEstado('PRESENTE', { estado: 'PRESENTE' })).toBe('Presente');
  });
});
