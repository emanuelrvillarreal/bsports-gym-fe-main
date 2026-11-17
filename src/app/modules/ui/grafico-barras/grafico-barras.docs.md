# Grafico De Barras

`app-grafico-barras` renderiza barras por cada objeto recibido y soporta 3 estilos: `normal`, `compacto` y `vs`.

## Modelo De Datos

```ts
import { BarraGrafico } from '../../ui/grafico-barras/grafico-barras.component';

protected readonly barras: readonly BarraGrafico[] = [
  { id: 'a', nombre: 'Equipo A', valor: 18, tope: 22 },
  { id: 'b', nombre: 'Equipo B', valor: 22, tope: 22 },
  { id: 'c', nombre: 'Equipo C', valor: 39, tope: 41 },
  { id: 'd', nombre: 'Equipo D', valor: 41, tope: 41 },
];
```

## Uso Basico

```html
<app-grafico-barras [barras]="barras" estilo="normal" orientacion="lateral" />
```

## Estilos Disponibles

1. `normal`: barras anchas.
2. `compacto`: barras finitas.
3. `vs`: agrupa y compara de a 2 barras, con eje de escala en `k`.

## Orientacion

```html
<app-grafico-barras [barras]="barras" estilo="compacto" orientacion="vertical" />
```

- `lateral`: barras acostadas.
- `vertical`: barras paradas.

## Reglas Visuales

- `0%` a `80%`: verde.
- `81%` a `95%`: naranja.
- `96%` a `100%`: naranja + sombra con pulso en `rgba(..., 0.5)`.
- Header de cada barra:
  - izquierda: nombre,
  - derecha: `valor/tope` (ejemplo `22/41`).
- Si llega al tope (`valor >= tope`), se muestra testigo con icono `heroBolt`.
- El relleno anima desde `0` hasta el valor final de cada barra.

## API

| Input             | Tipo                             | Default    | Descripcion                                                    |
| ----------------- | -------------------------------- | ---------- | -------------------------------------------------------------- |
| `barras`          | `readonly BarraGrafico[]`        | `[]`       | Datos a iterar.                                                |
| `estilo`          | `'normal' \| 'compacto' \| 'vs'` | `'normal'` | Variante visual del grafico.                                   |
| `escala`          | `boolean`                        | `false`    | Muestra marcas de escala en modo lateral.                      |
| `altoRendimiento` | `boolean`                        | `false`    | Desactiva drag-scroll, animaciones de relleno y pulso crítico. |

```ts
export interface BarraGrafico {
  readonly id?: string | number;
  readonly nombre: string;
  readonly valor: number;
  readonly tope: number;
  readonly etiquetaValor?: string;
  /** Override: clase CSS del relleno (default umbrales 80/95/100). */
  readonly barraClase?: (barra: BarraGrafico) => string | null;
  /** Override: etiqueta valor/tope. */
  readonly barraEtiqueta?: (barra: BarraGrafico, modoVs: boolean) => string;
}
```

## Helpers

| Helper                             | Uso                                        |
| ---------------------------------- | ------------------------------------------ |
| `grafico-barras-estado.helpers.ts` | Porcentaje, clases ok/alerta/critico, tope |
| `grafico-barras-escala.helpers.ts` | Escala K, etiquetas valor/tope             |

## Relacion Con Performance

Pasá `[altoRendimiento]="true"` en dashboards con muchas barras o junto a `PerformanceModeService`. Desactiva arrastre, animaciones `rellenar*` y `pulsoCritico`.

## Responsividad

El componente ocupa `100%` del ancho y alto del contenedor padre. Para controlar su tamano, definir dimensiones en el contenedor:

```html
<section style="width: 100%; height: 320px;">
  <app-grafico-barras [barras]="barras" />
</section>
```
