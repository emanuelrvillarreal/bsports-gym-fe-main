# FormularioConfiguracionEmpresaComponent

Formulario sin HTTP para editar los canales de contacto y comunicación del perfil institucional. El contenedor propietario fusiona su output con el snapshot completo del perfil y realiza el `PUT /companies/profile`.

```html
<app-formulario-configuracion-empresa
  [perfil]="perfil()"
  [bloqueado]="guardando()"
  [cargando]="guardando()"
  (configuracionEnviada)="guardarConfiguracion($event)"
/>
```

## Inputs

- `perfil`: snapshot del perfil institucional para precargar los campos.
- `bloqueado`: deshabilita la interacción.
- `cargando`: muestra estado de carga en las acciones y bloquea controles.
- `duracionErrorMs`: tiempo de visibilidad del error de validación; por defecto, 5000 ms.

## Outputs

- `configuracionEnviada`: emite teléfono y emails normalizados.

## Reglas

- Los emails no vacíos deben tener formato válido.
- El ícono textual de WhatsApp es decorativo y no es un enlace.
