import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardFinancieroHeroComponent } from './dashboard-financiero-hero.component';

describe('DashboardFinancieroHeroComponent', () => {
  let fixture: ComponentFixture<DashboardFinancieroHeroComponent>;
  let componente: DashboardFinancieroHeroComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardFinancieroHeroComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardFinancieroHeroComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('empresa', 'Alvear Club');
    fixture.componentRef.setInput('periodo', { anio: '2026', mes: '07' });
    fixture.componentRef.setInput('anios', [{ value: '2026', label: '2026' }]);
    fixture.componentRef.setInput('meses', [{ value: '07', label: 'Julio' }]);
    fixture.detectChanges();
  });

  it('muestra la empresa y el período activo', () => {
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.textContent).toContain('Alvear Club');
    expect(elemento.textContent).toContain('07/2026');
  });

  it('emite el período completo al cambiar el año', () => {
    const emitir = vi.fn();
    componente.periodoCambiado.subscribe(emitir);

    (componente as unknown as { cambiarAnio: (anio: string) => void }).cambiarAnio('2025');

    expect(emitir).toHaveBeenCalledWith({ anio: '2025', mes: '07' });
  });

  it('emite el restablecimiento cuando no está cargando', () => {
    const emitir = vi.fn();
    componente.restablecer.subscribe(emitir);

    (
      componente as unknown as { solicitarRestablecimiento: () => void }
    ).solicitarRestablecimiento();

    expect(emitir).toHaveBeenCalledOnce();
  });
});
