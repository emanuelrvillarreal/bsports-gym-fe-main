import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { PopupComponent } from './popup.component';

describe('PopupComponent', () => {
  const temaResuelto = signal<'dark' | 'light'>('dark');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupComponent],
      providers: [
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: temaResuelto },
        },
      ],
    }).compileComponents();
  });

  it('abre como dialogo modal y bloquea el scroll del documento', async () => {
    const fixture = TestBed.createComponent(PopupComponent);
    fixture.componentRef.setInput('titulo', 'Nueva actividad');
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog');

    expect(dialogo?.hasAttribute('open')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentRef.setInput('abierto', false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('impide el cierre mediante Escape', () => {
    const fixture = TestBed.createComponent(PopupComponent);
    fixture.componentRef.setInput('titulo', 'Editar socio');
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();

    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog');
    const evento = new Event('cancel', { cancelable: true });
    dialogo?.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(dialogo?.hasAttribute('open')).toBe(true);
  });

  it('no solicita el cierre al hacer click sobre el fondo', () => {
    const fixture = TestBed.createComponent(PopupComponent);
    let cancelaciones = 0;
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.componentRef.setInput('titulo', 'Editar socio');
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();

    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog');
    dialogo?.click();

    expect(cancelaciones).toBe(0);
    expect(dialogo?.hasAttribute('open')).toBe(true);
  });

  it('solo solicita cierre desde el boton Cancelar explicito', () => {
    const fixture = TestBed.createComponent(PopupComponent);
    let cancelaciones = 0;
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.componentRef.setInput('titulo', 'Nueva configuracion');
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
    boton?.click();

    expect(cancelaciones).toBe(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('dialog')?.hasAttribute('open'),
    ).toBe(true);
  });
});
