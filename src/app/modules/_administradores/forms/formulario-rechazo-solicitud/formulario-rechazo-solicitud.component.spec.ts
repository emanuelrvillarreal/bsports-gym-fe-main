import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FormularioRechazoSolicitudComponent } from './formulario-rechazo-solicitud.component';

describe('FormularioRechazoSolicitudComponent', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioRechazoSolicitudComponent] });
    const fixture = TestBed.createComponent(FormularioRechazoSolicitudComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('acepta el motivo opcional vacío', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads).toEqual([{ motivo: '' }]);
  });
  it('limita el motivo a 512 caracteres y lo emite', () => {
    const fixture = crear();
    const payloads: Array<{ motivo: string }> = [];
    fixture.componentInstance.enviado.subscribe((p) => payloads.push(p));
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'x'.repeat(600);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(payloads[0]?.motivo).toHaveLength(512);
  });
});
