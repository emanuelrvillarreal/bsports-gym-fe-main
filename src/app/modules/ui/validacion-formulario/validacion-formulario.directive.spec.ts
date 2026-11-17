import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ValidacionFormularioDirective } from './validacion-formulario.directive';

@Component({
  standalone: true,
  imports: [ValidacionFormularioDirective],
  template: `
    <form appValidacionFormulario (submit)="$event.preventDefault()">
      <input id="nombre" required />
      <input id="email" type="email" required />
      <div id="compuesto" data-app-invalido="true">
        <button data-app-form-control type="button">Abrir</button>
      </div>
      <button type="submit">Guardar</button>
    </form>
  `,
})
class FormularioNativoPruebaComponent {}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ValidacionFormularioDirective],
  template: `
    <form [formGroup]="formulario" appValidacionFormulario (ngSubmit)="$event.preventDefault()">
      <input id="reactivo" formControlName="nombre" />
      <button type="submit">Guardar</button>
    </form>
  `,
})
class FormularioReactivoPruebaComponent {
  readonly formulario = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}

describe('ValidacionFormularioDirective', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioNativoPruebaComponent, FormularioReactivoPruebaComponent],
    }).compileComponents();
  });

  it('marca todos los campos invalidos y enfoca el primero', async () => {
    const fixture = TestBed.createComponent(FormularioNativoPruebaComponent);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const formulario = elemento.querySelector('form')!;

    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    const invalidos = elemento.querySelectorAll('.app-control--invalido');
    expect(invalidos.length).toBeGreaterThanOrEqual(4);
    expect(elemento.querySelector('#nombre')?.getAttribute('aria-invalid')).toBe('true');
    expect(elemento.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    expect(elemento.querySelector('#compuesto')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(elemento.querySelector('#nombre'));
  });

  it('limpia solamente el campo corregido despues del intento', async () => {
    const fixture = TestBed.createComponent(FormularioNativoPruebaComponent);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const formulario = elemento.querySelector('form')!;
    const nombre = elemento.querySelector<HTMLInputElement>('#nombre')!;

    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    nombre.value = 'Ana';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(nombre.classList.contains('app-control--invalido')).toBe(false);
    expect(nombre.getAttribute('aria-invalid')).toBe('false');
    expect(elemento.querySelector('#email')?.classList.contains('app-control--invalido')).toBe(
      true,
    );
  });

  it('marca como tocados los controles de Reactive Forms', async () => {
    const fixture = TestBed.createComponent(FormularioReactivoPruebaComponent);
    fixture.detectChanges();
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.formulario.controls.nombre.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('#reactivo').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });
});
