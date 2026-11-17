import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { FormularioCertificadoMedicoComponent } from '../../forms/formulario-certificado-medico/formulario-certificado-medico.component';
import { CertificadosMedicosPortalComponent } from './certificados-medicos-portal.component';

describe('CertificadosMedicosPortalComponent', () => {
  it('sube el certificado propio y no ofrece el archivo vencido', () => {
    const subirCertificado = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [CertificadosMedicosPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: { subirCertificado } },
        { provide: ThemeModeService, useValue: { resolvedMode: signal<'light' | 'dark'>('light') } },
      ],
    });
    const fixture = TestBed.createComponent(CertificadosMedicosPortalComponent);
    fixture.componentRef.setInput('memberUuid', 'member-propio');
    fixture.componentRef.setInput('certificados', [
      { certificadoUuid: 'vencido', memberUuid: 'member-propio', nombreArchivo: 'anterior.pdf', fechaCarga: '01/01/2025', fechaExpiracion: '01/01/2026', estado: 'VENCIDO', urlArchivo: 'https://archivo' },
      { certificadoUuid: 'denegado', memberUuid: 'member-propio', nombreArchivo: 'rechazado.pdf', fechaCarga: '02/01/2026', fechaExpiracion: '02/01/2027', estado: 'DENEGADO', urlArchivo: null },
    ]);
    fixture.detectChanges();

    const formulario = fixture.debugElement.query(By.directive(FormularioCertificadoMedicoComponent))
      .componentInstance as FormularioCertificadoMedicoComponent;
    const limpiarSeleccion = vi.spyOn(formulario, 'limpiarSeleccion');

    (fixture.componentInstance as any).subir(new File(['pdf'], 'nuevo.pdf', { type: 'application/pdf' }));

    expect(subirCertificado).toHaveBeenCalledWith('member-propio', expect.any(File));
    expect(limpiarSeleccion).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('archivo vencido ya no está disponible');
    const chipDenegado = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.certificados-medicos__chip-estado'),
    ).find((chip) => chip.textContent?.trim() === 'Denegado');
    expect(chipDenegado?.classList).toContain('certificados-medicos__chip-estado--denegado');
  });
});
