# Solapas

`app-solapas` dibuja una fila de pestañas navegables. Cada pestaña es un link a su propia ruta (no cambia contenido en la misma página), así que funciona con el botón atrás, se puede compartir la URL y marca la activa con `aria-current="page"`.

## Uso básico

```ts
import { SolapaNavegable, SolapasComponent } from './modules/ui/solapas/solapas.component';

@Component({
  imports: [SolapasComponent, RouterOutlet],
  template: `
    <app-solapas [solapas]="solapas" etiquetaGrupo="Pantallas de Socios" />
    <router-outlet />
  `,
})
export class EjemploComponent {
  protected readonly solapas: readonly SolapaNavegable[] = [
    { etiqueta: 'Socios', icono: 'socios', ruta: '/admin/socios/listado' },
    { etiqueta: 'Solicitudes', icono: 'solicitudesSocios', ruta: '/admin/socios/solicitudes', contador: 3 },
  ];
}
```

## Inputs

| Input           | Tipo                         | Default | Descripción                                                    |
| --------------- | ---------------------------- | ------- | -------------------------------------------------------------- |
| `solapas`       | `readonly SolapaNavegable[]` | —       | Pestañas en orden. Requerido.                                  |
| `etiquetaGrupo` | `string`                     | —       | Nombre accesible del `<nav>` (ej. "Pantallas de Socios").      |

`SolapaNavegable`: `etiqueta`, `ruta`, `icono?` (clave de `IconoApp`) y `contador?`. El contador se muestra como burbuja roja solo si es mayor a 0 y se anuncia como "N pendientes".

## Comportamiento

- En pantallas angostas la fila se desliza horizontalmente en lugar de apilarse.
- Usa los tokens `--app-accent`, `--app-accent-soft`, `--app-text`, `--app-text-soft` y `--app-surface-border`, por lo que sigue el branding y el modo oscuro.
- No contiene lógica de negocio: qué pestañas se muestran lo decide el contenedor. En el panel administrativo lo hace `SeccionConSolapasPageComponent` a partir de `secciones-administracion.ts`.
