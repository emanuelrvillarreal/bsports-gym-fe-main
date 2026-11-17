import { TestBed } from '@angular/core/testing';

import { PagoResultadoService } from './pago-resultado.service';

describe('PagoResultadoService', () => {
  let service: PagoResultadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagoResultadoService);
  });

  it('guarda la referencia externa recortada como valor opaco', () => {
    service.guardarReferenciaExterna('  referencia-no-uuid  ');

    expect(service.referenciaExterna()).toBe('referencia-no-uuid');
  });

  it('ignora referencias vacías y conserva el último valor válido', () => {
    service.guardarReferenciaExterna('referencia-vigente');
    service.guardarReferenciaExterna('   ');
    service.guardarReferenciaExterna(null);
    service.guardarReferenciaExterna(undefined);

    expect(service.referenciaExterna()).toBe('referencia-vigente');
  });

  it('mantiene la referencia durante la vida de la instancia en memoria', () => {
    service.guardarReferenciaExterna('referencia-en-memoria');

    expect(TestBed.inject(PagoResultadoService).referenciaExterna()).toBe('referencia-en-memoria');
  });
});
