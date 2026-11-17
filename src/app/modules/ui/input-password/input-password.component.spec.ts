import { TestBed } from '@angular/core/testing';

import { InputPasswordComponent } from './input-password.component';

describe('InputPasswordComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputPasswordComponent],
    }).compileComponents();
  });

  it('reenvia requerido y autocomplete al input nativo', () => {
    const fixture = TestBed.createComponent(InputPasswordComponent);
    fixture.componentRef.setInput('requerido', true);
    fixture.componentRef.setInput('autocomplete', 'current-password');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.autocomplete).toBe('current-password');
  });

  it('emite el valor y permite alternar la visibilidad', () => {
    const fixture = TestBed.createComponent(InputPasswordComponent);
    const valores: string[] = [];
    fixture.componentInstance.valorCambiado.subscribe((valor) => valores.push(valor));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const alternador = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    input.value = 'secreto';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(valores).toEqual(['secreto']);
    expect(input.type).toBe('password');

    alternador.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
  });
});
