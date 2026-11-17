import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { ColorThemeService } from '../color-mod/color-theme.service';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { LectorQrComponent } from './lector-qr.component';

type CallbackLectura = (resultado?: { getText(): string }, error?: unknown) => void;

const zxing = vi.hoisted(() => ({
  listar: vi.fn(),
  decodificar: vi.fn(),
  detener: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: class {
    static listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
      return zxing.listar();
    }

    decodeFromVideoDevice(
      dispositivoId: string | undefined,
      video: HTMLVideoElement,
      callback: CallbackLectura,
    ): Promise<{ stop(): void }> {
      return zxing.decodificar(dispositivoId, video, callback);
    }
  },
}));

describe('LectorQrComponent', () => {
  let fixture: ComponentFixture<LectorQrComponent>;
  let callbackLectura: CallbackLectura;

  const camaras = [
    { deviceId: 'frontal', label: 'Cámara frontal', kind: 'videoinput' },
    { deviceId: 'trasera', label: 'Cámara trasera', kind: 'videoinput' },
  ] as MediaDeviceInfo[];

  beforeEach(async () => {
    zxing.listar.mockReset();
    zxing.decodificar.mockReset();
    zxing.detener.mockReset();
    zxing.listar.mockResolvedValue(camaras);
    zxing.decodificar.mockImplementation(
      async (_dispositivoId: string, _video: HTMLVideoElement, callback: CallbackLectura) => {
        callbackLectura = callback;
        return { stop: zxing.detener };
      },
    );

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [LectorQrComponent],
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

    fixture = TestBed.createComponent(LectorQrComponent);
  });

  it('mantiene disponible el ingreso manual y emite con Enter', () => {
    const contenidos: string[] = [];
    fixture.componentInstance.contenidoLeido.subscribe((contenido) => contenidos.push(contenido));
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const input = elemento.querySelector<HTMLInputElement>('#lector-qr-manual');
    const formulario = elemento.querySelector<HTMLFormElement>('form');

    expect(input).not.toBeNull();
    expect(elemento.textContent).toContain('lector USB');

    input!.value = ' SOCIO-123 ';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    formulario!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(contenidos).toEqual(['SOCIO-123']);
    expect(input!.value).toBe('');
  });

  it('enumera cámaras, prefiere la trasera y omite lecturas rápidas duplicadas', async () => {
    const contenidos: string[] = [];
    fixture.componentInstance.contenidoLeido.subscribe((contenido) => contenidos.push(contenido));
    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();

    await vi.waitFor(() => expect(zxing.decodificar).toHaveBeenCalledOnce());
    fixture.detectChanges();

    expect(zxing.decodificar.mock.calls[0][0]).toBe('trasera');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-select')).not.toBeNull();

    callbackLectura({ getText: () => 'QR-456' });
    callbackLectura({ getText: () => 'QR-456' });

    expect(contenidos).toEqual(['QR-456']);
  });

  it('libera los controles al desactivarse', async () => {
    const detenerTrack = vi.fn();
    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();
    await vi.waitFor(() => expect(zxing.decodificar).toHaveBeenCalledOnce());
    const video = (fixture.nativeElement as HTMLElement).querySelector('video');
    video!.srcObject = {
      getTracks: () => [{ stop: detenerTrack }],
    } as unknown as MediaStream;

    fixture.componentRef.setInput('activo', false);
    fixture.detectChanges();

    expect(zxing.detener).toHaveBeenCalledOnce();
    expect(detenerTrack).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'La cámara está desactivada',
    );
  });

  it('informa cuando el permiso fue denegado y conserva el fallback', async () => {
    zxing.decodificar.mockRejectedValue(new DOMException('Permiso denegado', 'NotAllowedError'));
    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Revisá el permiso del navegador',
      );
    });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#lector-qr-manual'),
    ).not.toBeNull();
  });

  it('no solicita la cámara fuera de un contexto seguro', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'requiere HTTPS o localhost',
      );
    });
    expect(zxing.decodificar).not.toHaveBeenCalled();
  });
});
