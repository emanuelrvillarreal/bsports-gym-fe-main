import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PagoResultadoService {
  private readonly referenciaExternaInterna = signal<string | null>(null);

  readonly referenciaExterna = this.referenciaExternaInterna.asReadonly();

  guardarReferenciaExterna(valor: string | null | undefined): void {
    const referencia = valor?.trim();

    if (!referencia) {
      return;
    }

    this.referenciaExternaInterna.set(referencia);
  }
}
