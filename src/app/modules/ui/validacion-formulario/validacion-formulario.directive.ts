import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
import { FormGroupDirective } from '@angular/forms';

const SELECTOR_CAMPOS = ['input', 'select', 'textarea', 'app-select', '[data-app-invalido]'].join(
  ',',
);
const CLASE_INVALIDA = 'app-control--invalido';

/** Presenta los errores y navega al primer campo invalido sin conocer reglas de negocio. */
@Directive({
  selector: 'form[appValidacionFormulario]',
  standalone: true,
})
export class ValidacionFormularioDirective implements OnDestroy {
  private readonly formulario = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly formularioReactivo = inject(FormGroupDirective, {
    optional: true,
    self: true,
  });
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private enviado = false;
  private destruida = false;
  private readonly elementosAdministrados = new Set<HTMLElement>();

  readonly activa = input(true, {
    alias: 'appValidacionFormulario',
    transform: booleanAttribute,
  });

  constructor() {
    effect(() => {
      if (!this.activa()) this.reiniciar();
    });
  }

  ngOnDestroy(): void {
    this.destruida = true;
    this.limpiarPresentacion();
  }

  @HostListener('submit')
  protected manejarEnvio(): void {
    if (!this.activa()) return;

    this.formularioReactivo?.control.markAllAsTouched();
    this.enviado = true;
    this.actualizarEnMicrotarea(true);
  }

  @HostListener('input')
  @HostListener('change')
  protected manejarCambio(): void {
    if (!this.enviado || !this.activa()) return;
    this.actualizarEnMicrotarea(false);
  }

  @HostListener('reset')
  protected manejarReset(): void {
    queueMicrotask(() => this.reiniciar());
  }

  reiniciar(): void {
    this.enviado = false;
    this.limpiarPresentacion();
  }

  private actualizarEnMicrotarea(enfocarPrimero: boolean): void {
    queueMicrotask(() => {
      if (!this.destruida && this.activa()) this.actualizarPresentacion(enfocarPrimero);
    });
  }

  private actualizarPresentacion(enfocarPrimero: boolean): void {
    const campos = Array.from(
      this.formulario.querySelectorAll<HTMLElement>(SELECTOR_CAMPOS),
    ).filter((campo) => {
      const contenedor = campo.parentElement?.closest<HTMLElement>('[data-app-invalido]');
      return !contenedor || contenedor === campo;
    });
    const invalidos: HTMLElement[] = [];

    for (const campo of campos) {
      const invalido = this.esCampoInvalido(campo);
      this.aplicarEstado(campo, invalido);
      if (invalido) invalidos.push(campo);
    }

    if (enfocarPrimero && invalidos.length) this.enfocar(invalidos[0]);
  }

  private esCampoInvalido(campo: HTMLElement): boolean {
    if (
      campo.matches(':disabled, [aria-disabled="true"]') ||
      campo.getAttribute('type') === 'hidden'
    ) {
      return false;
    }
    if (campo.dataset['appInvalido'] === 'true') return true;
    if (campo.classList.contains('ng-invalid')) return true;
    return this.esControlNativo(campo) && campo.willValidate && !campo.validity.valid;
  }

  private aplicarEstado(campo: HTMLElement, invalido: boolean): void {
    const objetivo = this.resolverObjetivoFoco(campo);
    const elementos = objetivo === campo ? [campo] : [campo, objetivo];

    for (const elemento of elementos) {
      elemento.classList.toggle(CLASE_INVALIDA, invalido);
      elemento.setAttribute('aria-invalid', String(invalido));
      this.elementosAdministrados.add(elemento);
    }
  }

  private enfocar(campo: HTMLElement): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const objetivo = this.resolverObjetivoFoco(campo);
    const reducirMovimiento = this.document.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    objetivo.scrollIntoView?.({
      behavior: reducirMovimiento ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    objetivo.focus?.({ preventScroll: true });
  }

  private resolverObjetivoFoco(campo: HTMLElement): HTMLElement {
    if (this.esControlEnfocable(campo)) return campo;

    const declarado = campo.querySelector<HTMLElement>('[data-app-form-control]');
    if (declarado) {
      if (this.esControlEnfocable(declarado)) return declarado;
      const interno = declarado.querySelector<HTMLElement>(
        'button:not(:disabled), input, select, textarea',
      );
      if (interno) return interno;
    }

    return (
      campo.querySelector<HTMLElement>(
        'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? campo
    );
  }

  private limpiarPresentacion(): void {
    for (const elemento of this.elementosAdministrados) {
      elemento.classList.remove(CLASE_INVALIDA);
      elemento.removeAttribute('aria-invalid');
    }
    this.elementosAdministrados.clear();
  }

  private esControlNativo(
    elemento: HTMLElement,
  ): elemento is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(elemento.tagName);
  }

  private esControlEnfocable(elemento: HTMLElement): boolean {
    return elemento.matches('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
  }
}
