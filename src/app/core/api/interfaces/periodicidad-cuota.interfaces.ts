/** Valores aceptados por los contratos de periodicidad de cuotas. */
export type PeriodicidadCuota =
  | 'SEMANAL'
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'CUATRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export const OPCIONES_PERIODICIDAD_CUOTA: readonly {
  readonly valor: PeriodicidadCuota;
  readonly etiqueta: string;
}[] = [
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' },
  { valor: 'BIMESTRAL', etiqueta: 'Bimestral' },
  { valor: 'TRIMESTRAL', etiqueta: 'Trimestral' },
  { valor: 'CUATRIMESTRAL', etiqueta: 'Cuatrimestral' },
  { valor: 'SEMESTRAL', etiqueta: 'Semestral' },
  { valor: 'ANUAL', etiqueta: 'Anual' },
];

export const PERIODICIDAD_CUOTA_PREDETERMINADA: PeriodicidadCuota = 'MENSUAL';
