import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, beforeEach } from 'vitest';

import { ColorThemeService } from '../../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../../ui/dark-mode/theme-mode.service';
import {
  FormularioNotificacionMoraComponent,
  NotificacionMoraPayload,
} from './formulario-notificacion-mora.component';

describe('FormularioNotificacionMoraComponent', () => {
  let fixture: ComponentFixture<FormularioNotificacionMoraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioNotificacionMoraComponent],
      providers: [
        { provide: ThemeModeService, useValue: { resolvedMode: signal<'dark' | 'light'>('dark') } },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#4982fd'),
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioNotificacionMoraComponent);
    fixture.componentRef.setInput('cuota', {
      titular: 'Ana Pérez',
      titularEmail: 'SOCIO@EJEMPLO.COM',
      titularTelefono: null,
      concepto: 'Cuota social',
      monto: '$10.000',
      vencimiento: '2026-08-10',
    });
    fixture.componentRef.setInput('empresa', {
      nombre: 'Club Norte',
      email: 'info@clubnorte.com',
      telefono: '11 4444-5555',
    });
    fixture.detectChanges();
  });

  it('usa internamente el teléfono del titular y normaliza el destinatario de WhatsApp', () => {
    const emitido: NotificacionMoraPayload[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => emitido.push(payload));
    const componente = fixture.componentInstance;
    componente['telefono'].set('11 1234-5678');

    componente['enviar']();

    expect(emitido).toEqual([
      expect.objectContaining({ canal: 'WHATSAPP', destinatario: '5491112345678' }),
    ]);
    expect(componente['mensaje']()).toContain('Club Norte');
    expect(componente['mensaje']()).toContain('Cuota social');
    expect(componente['mensaje']()).toContain('portal del socio mediante Mercado Pago');
    expect(componente['mensaje']()).toContain('Atentamente: Club Norte');
    expect(componente['mensaje']()).toContain('\n\nAtentamente: Club Norte');
  });

  it('rechaza WhatsApp cuando el teléfono interno no es válido', () => {
    fixture.componentInstance['telefono'].set('123');

    fixture.componentInstance['enviar']();

    expect(fixture.componentInstance['error']()).toContain('teléfono argentino válido');
  });

  it('muestra el switch de canal y no expone datos de contacto internos', () => {
    const interruptor = fixture.nativeElement.querySelector('[role="switch"]') as HTMLInputElement | null;

    expect(interruptor?.checked).toBe(true);
    expect(fixture.nativeElement.querySelector('#notificacion-mora-telefono')).toBeNull();
    expect(fixture.nativeElement.querySelector('#notificacion-mora-email')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('cuenta vinculada en este dispositivo');
  });

  it('valida y emite el correo interno', () => {
    const emitido: NotificacionMoraPayload[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => emitido.push(payload));
    const componente = fixture.componentInstance;
    componente['cambiarCanal']('EMAIL');

    componente['enviar']();

    expect(emitido).toEqual([
      expect.objectContaining({ canal: 'EMAIL', destinatario: 'socio@ejemplo.com' }),
    ]);
  });

  it('limita el mensaje a 700 caracteres y muestra el contador dinámico', () => {
    const mensaje = 'a'.repeat(701);
    const evento = { target: { value: mensaje } } as unknown as Event;

    fixture.componentInstance['actualizarMensaje'](evento);
    fixture.detectChanges();

    expect(fixture.componentInstance['mensaje']()).toHaveLength(700);
    expect(fixture.componentInstance['cantidadCaracteresMensaje']()).toBe(700);
    expect(fixture.nativeElement.textContent).toContain('700 / 700 caracteres');
  });
});
