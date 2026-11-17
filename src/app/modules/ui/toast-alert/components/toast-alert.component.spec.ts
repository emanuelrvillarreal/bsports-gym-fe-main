import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastAlertComponent } from './toast-alert.component';
import { ToastAlertHostComponent } from './toast-alert-host.component';
import { ToastAlertService } from '../services/toast-alert.service';

describe('ToastAlertComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastAlertComponent, ToastAlertHostComponent],
    }).compileComponents();
  });

  it('usa botones nativos en las confirmaciones de peligro', () => {
    const fixture = TestBed.createComponent(ToastAlertComponent);
    fixture.componentRef.setInput('icono', '');
    fixture.componentRef.setInput('confirmacion', true);
    fixture.componentRef.setInput('fondoPeligro', true);
    fixture.componentRef.setInput('duracionMs', 0);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelectorAll('app-boton')).toHaveLength(0);
    expect(elemento.querySelectorAll('.toast-alert__acciones button')).toHaveLength(2);
    expect(elemento.querySelector('.toast-alert__cerrar')).toBeInstanceOf(HTMLButtonElement);
  });

  it('usa dialog modal con fondo de peligro cuando no es confirmacion', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });

    const fixture = TestBed.createComponent(ToastAlertComponent);
    fixture.componentRef.setInput('fondoPeligro', true);
    fixture.componentRef.setInput('duracionMs', 0);
    fixture.componentRef.setInput('posicion', 'centrada');
    fixture.componentRef.setInput('texto', 'Debe abonar para ingresar.');
    fixture.detectChanges();

    const dialogo = fixture.nativeElement.querySelector('dialog.toast-alert') as HTMLDialogElement;

    expect(dialogo).toBeTruthy();
    expect(dialogo.classList.contains('toast-alert--peligro')).toBe(true);
    expect(dialogo.getAttribute('role')).toBe('alert');
    expect(fixture.nativeElement.querySelector('.toast-alert__fondo')).toBeNull();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('inicia el cierre antes de emitir una confirmación', () => {
    const fixture = TestBed.createComponent(ToastAlertComponent);
    fixture.componentRef.setInput('confirmacion', true);
    fixture.componentRef.setInput('duracionMs', 0);
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as { cerrando(): boolean };

    fixture.componentInstance.confirmada.subscribe(() => {
      expect(componente.cerrando()).toBe(true);
    });

    (fixture.nativeElement.querySelector('.toast-alert__boton--primario') as HTMLButtonElement).click();
  });

  it('muestra confirmaciones consecutivas aunque entre ellas haya un toast de éxito', async () => {
    const fixture = TestBed.createComponent(ToastAlertHostComponent);
    const servicio = TestBed.inject(ToastAlertService);
    fixture.detectChanges();

    const primeraConfirmacion = servicio.confirmDanger('Eliminar primer registro');
    fixture.detectChanges();
    await fixture.whenStable();

    let dialogo = fixture.nativeElement.querySelector('dialog.toast-alert') as HTMLDialogElement;
    expect(dialogo?.open).toBe(true);
    (
      fixture.nativeElement.querySelector(
        '.toast-alert__boton--primario',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await expect(primeraConfirmacion).resolves.toBe(true);

    servicio.success('Primer registro eliminado');
    fixture.detectChanges();
    await fixture.whenStable();

    const segundaConfirmacion = servicio.confirmDanger('Eliminar segundo registro');
    fixture.detectChanges();
    await fixture.whenStable();

    dialogo = fixture.nativeElement.querySelector('dialog.toast-alert') as HTMLDialogElement;
    expect(dialogo?.open).toBe(true);
    expect(dialogo?.textContent).toContain('Eliminar segundo registro');
    (
      fixture.nativeElement.querySelector(
        '.toast-alert__boton--primario',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    await expect(segundaConfirmacion).resolves.toBe(true);
  });
});
