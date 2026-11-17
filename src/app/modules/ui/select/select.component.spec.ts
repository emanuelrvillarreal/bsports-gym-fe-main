import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { SelectComponent } from './select.component';

@Component({
  standalone: true,
  imports: [SelectComponent],
  template: `
    <dialog open>
      <app-select
        etiqueta="Parentesco"
        [opciones]="opciones"
        placeholder="Seleccionar parentesco"
      />
    </dialog>
  `,
})
class SelectEnDialogoComponent {
  protected readonly opciones = [
    { value: 'HIJO', label: 'Hijo' },
    { value: 'CONYUGE', label: 'Cónyuge' },
  ];
}

describe('SelectComponent', () => {
  const temaResuelto = signal<'dark' | 'light'>('dark');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectEnDialogoComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: temaResuelto },
        },
      ],
    }).compileComponents();
  });

  it('monta el panel dentro del dialogo para permanecer en la capa modal', () => {
    const fixture = TestBed.createComponent(SelectEnDialogoComponent);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const dialogo = elemento.querySelector('dialog');
    const panel = dialogo?.querySelector(':scope > .app-select__panel');
    const control = elemento.querySelector<HTMLButtonElement>('.app-select__control button');
    control?.click();
    fixture.detectChanges();

    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('app-select__panel--visible')).toBe(true);
  });

  it('expone el control interno para la validacion transversal', () => {
    const fixture = TestBed.createComponent(SelectEnDialogoComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-app-form-control]')).not.toBeNull();
  });

  it('emite un change DOM al seleccionar para refrescar la validacion del formulario', () => {
    const fixture = TestBed.createComponent(SelectEnDialogoComponent);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const select = elemento.querySelector('app-select') as HTMLElement;
    let cambios = 0;
    select.addEventListener('change', () => cambios++);

    elemento.querySelector<HTMLButtonElement>('.app-select__control button')?.click();
    fixture.detectChanges();
    elemento
      .querySelector<HTMLButtonElement>('dialog > .app-select__panel .app-select__opcion button')
      ?.click();

    expect(cambios).toBe(1);
  });
});
