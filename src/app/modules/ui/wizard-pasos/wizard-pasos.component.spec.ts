import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { WizardPasosComponent } from './wizard-pasos.component';

describe('WizardPasosComponent', () => {
  let fixture: ComponentFixture<WizardPasosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WizardPasosComponent] }).compileComponents();
    fixture = TestBed.createComponent(WizardPasosComponent);
    fixture.componentRef.setInput('pasos', [
      { id: 'socio', etiqueta: 'Socio' },
      { id: 'deuda', etiqueta: 'Deuda' },
      { id: 'confirmacion', etiqueta: 'Confirmación' },
    ]);
    fixture.componentRef.setInput('pasoActual', 'deuda');
    fixture.detectChanges();
  });

  it('marca el paso activo y anuncia su posición', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[aria-current="step"]')?.textContent).toContain('Deuda');
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('Paso 2 de 3: Deuda');
  });

  it('marca como completados únicamente los pasos anteriores', () => {
    expect(fixture.nativeElement.querySelectorAll('.wizard-pasos__paso--completo')).toHaveLength(1);
  });
});
