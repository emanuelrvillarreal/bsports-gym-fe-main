# Titulo Hero

`app-titulo-hero` es un encabezado grande y reusable para paginas o secciones principales.

## Uso

```html
<app-titulo-hero icono="inicio" titulo="Home" subtitulo="Resumen general del sistema" />
```

Con acciones:

```html
<app-titulo-hero titulo="Config" icono="configuracion">
  <button tituloHeroAcciones type="button">Accion</button>
</app-titulo-hero>
```

## Alcance

Pensado para:

- encabezados de pagina
- encabezados de modulos
- vistas principales del template

## Inputs

| Input             | Tipo                                   | Default   | Descripcion                                                               |
| ----------------- | -------------------------------------- | --------- | ------------------------------------------------------------------------- |
| `titulo`          | `string`                               | requerido | Titulo principal.                                                         |
| `subtitulo`       | `string`                               | `''`      | Texto secundario opcional.                                                |
| `icono`           | `IconoPagina \| NombreIconoTituloHero` | `''`      | Clave semántica central o nombre compatible registrado.                   |
| `logoUrl`         | `string`                               | `''`      | Imagen opcional para reemplazar el ícono.                                  |
| `logoCircular`    | `boolean`                              | `false`   | Muestra `logoUrl` como avatar circular con borde primario.                 |
| `color`           | `string`                               | `''`      | Color del titulo/icono. Si no viene, usa `--app-accent`.                  |
| `altoRendimiento` | `boolean`                              | `false`   | Desactiva animaciones de entrada (clase `titulo-hero--alto-rendimiento`). |

## Outputs

No emite eventos.

## Slots

- `tituloHeroAcciones`: contenido opcional alineado a la derecha

## Impacto En El Sistema

Consume:

- `--app-accent`
- `--app-text-soft`

Si se pasa `color`, ese valor pisa el color por defecto del hero.

En pages de la aplicación se deben usar las mismas claves semánticas del
navbar (`inicio`, `socios`, `calendario`, `credencial`, etc.). Los nombres
`hero...` quedan soportados para composiciones visuales internas existentes.

## Relacion Con Performance

Expone `[altoRendimiento]="true"`. Desactiva animaciones de entrada en titulo, icono y subtitulo via `titulo-hero--alto-rendimiento`.
