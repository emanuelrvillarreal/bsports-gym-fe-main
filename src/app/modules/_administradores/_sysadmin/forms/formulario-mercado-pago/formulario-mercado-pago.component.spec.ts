import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FormularioMercadoPagoComponent } from './formulario-mercado-pago.component';

describe('FormularioMercadoPagoComponent', () => {
  function crear() {
    TestBed.configureTestingModule({ imports: [FormularioMercadoPagoComponent] });
    const fixture = TestBed.createComponent(FormularioMercadoPagoComponent);
    fixture.detectChanges();
    return fixture;
  }

  function completar(fixture: ReturnType<typeof crear>, id: string, valor: string) {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('exige las tres credenciales durante la primera configuración', () => {
    const fixture = crear();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(payloads).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('primera configuración');
  });

  it('emite solo la credencial rotada cuando ya existen hints', () => {
    const fixture = crear();
    fixture.componentRef.setInput('configuracion', {
      habilitado: true,
      operativo: true,
      webhookOperativo: true,
      accessTokenHint: '****1234',
    });
    fixture.detectChanges();
    const payloads: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => payloads.push(payload));

    completar(fixture, 'mp-webhook-secret', ' secreto-rotado ');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(payloads).toEqual([{ webhookSecret: 'secreto-rotado' }]);
  });

  it('limpia los secretos al solicitarlo el contenedor', () => {
    const fixture = crear();
    completar(fixture, 'mp-access-token', 'token');

    fixture.componentInstance.limpiarSecretos();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#mp-access-token') as HTMLInputElement).value).toBe('');
  });
});
