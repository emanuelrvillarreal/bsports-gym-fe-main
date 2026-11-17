import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FacturaDto } from '../../../../core/api/interfaces/facturas.interfaces';
import { FacturaResumenComponent } from './factura-resumen.component';

describe('FacturaResumenComponent', () => {
  let fixture: ComponentFixture<FacturaResumenComponent>;

  const factura: FacturaDto = {
    facturaUuid: 'factura-local',
    uuidFacturaCrm: 'factura-crm',
    codigoPlan: null,
    codigosProductos: ['producto-extra'],
    importe: null,
    fechaGeneracion: '01/09/2026',
    fechaVencimiento: '15/09/2026',
    estado: 'PENDIENTE',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FacturaResumenComponent] }).compileComponents();
    fixture = TestBed.createComponent(FacturaResumenComponent);
    fixture.componentRef.setInput('factura', factura);
    fixture.detectChanges();
  });

  it('muestra guion para importe nulo sin inventar datos fiscales', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('—');
    expect(texto).toContain('Sin plan asociado');
    expect(texto).toContain('producto-extra');
    expect(texto).not.toContain('Número de factura');
  });
});
