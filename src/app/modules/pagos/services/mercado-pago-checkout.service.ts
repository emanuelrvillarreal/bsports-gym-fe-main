import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import * as QRCode from 'qrcode';

/** Centraliza las acciones explícitas de Checkout Pro y rechaza destinos no HTTPS. */
@Injectable({ providedIn: 'root' })
export class MercadoPagoCheckoutService {
  private readonly document = inject(DOCUMENT);

  normalizarEnlace(initPoint: string): string | null {
    try {
      const destino = new URL(initPoint.trim());
      return destino.protocol === 'https:' ? destino.href : null;
    } catch {
      return null;
    }
  }

  async generarQr(initPoint: string): Promise<string | null> {
    const destino = this.normalizarEnlace(initPoint);
    if (!destino) return null;

    try {
      return await QRCode.toDataURL(destino, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
      });
    } catch {
      return null;
    }
  }

  async copiarEnlace(initPoint: string): Promise<boolean> {
    const ventana = this.document.defaultView;
    const destino = this.normalizarEnlace(initPoint);
    if (!ventana?.navigator.clipboard || !destino) return false;

    try {
      await ventana.navigator.clipboard.writeText(destino);
      return true;
    } catch {
      return false;
    }
  }

  abrirCheckout(initPoint: string): boolean {
    const ventana = this.document.defaultView;
    const destino = this.normalizarEnlace(initPoint);
    if (!ventana || !destino) return false;

    try {
      const checkout = ventana.open(destino, '_blank');
      if (!checkout) return false;
      checkout.opener = null;
      return true;
    } catch {
      return false;
    }
  }
}
