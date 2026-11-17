import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { FormularioCertificadoMedicoComponent } from './formulario-certificado-medico.component';

describe('FormularioCertificadoMedicoComponent', () => {
  function crear() {
    TestBed.configureTestingModule({
      imports: [FormularioCertificadoMedicoComponent],
      providers: [{ provide: ThemeModeService, useValue: { resolvedMode: signal<'light' | 'dark'>('light') } }],
    });
    return TestBed.createComponent(FormularioCertificadoMedicoComponent);
  }

  it('acepta un PDF de hasta 2 MB y emite el archivo seleccionado', () => {
    const fixture = crear();
    const archivo = new File(['certificado'], 'apto.pdf', { type: 'application/pdf' });
    const input = fixture.nativeElement.querySelector('#certificado-archivo') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
    const emitidos: File[] = [];
    fixture.componentInstance.seleccionado.subscribe((valor) => emitidos.push(valor));

    input.dispatchEvent(new Event('change'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));

    expect(emitidos).toEqual([archivo]);
  });

  it('rechaza formatos no permitidos', () => {
    const fixture = crear();
    const archivo = new File(['texto'], 'certificado.txt', { type: 'text/plain' });
    const input = fixture.nativeElement.querySelector('#certificado-archivo') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Seleccioná un archivo PNG, JPG, JPEG o PDF.');
  });
});
