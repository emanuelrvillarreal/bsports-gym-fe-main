# Color Mod

`app-color-mod` es el editor presentacional de la identidad cromática. Aplica el preview de
forma inmediata, pero no conoce endpoints, sesión, permisos ni notificaciones.

## Contrato

```html
<app-color-mod
  [paletaPersistida]="paleta()"
  [guardando]="guardando()"
  [restableciendo]="restableciendo()"
  (guardarSolicitado)="guardar($event)"
  (restablecerSolicitado)="restablecer($event)"
/>
```

### Inputs

- `paletaPersistida: PaletaGuardada | null`: referencia confirmada por el contenedor.
- `guardando: boolean`: bloquea la edición y muestra carga en el guardado.
- `restableciendo: boolean`: bloquea la edición durante el restablecimiento.
- `altoRendimiento: boolean`: desactiva animaciones decorativas.

### Outputs

- `guardarSolicitado: PaletaGuardada`: paleta completa que el contenedor debe persistir.
- `restablecerSolicitado: PaletaGuardada`: paleta predeterminada confirmada por el usuario.

Si la persistencia falla, el contenedor no actualiza `paletaPersistida`; así el editor conserva
los cambios y mantiene habilitada la acción de reintento.

## Motor visual

`ColorThemeService` escribe los tokens globales de branding en `html` y `body`. Su API pública
incluye `establecerPaleta`, `obtenerPaletaActual`, `obtenerPaletaPredeterminada` y
`establecerContextoEmpresa`. El contexto se mantiene por compatibilidad, pero la paleta se
persiste en una única clave global: el branding de la empresa nueva reemplaza al anterior.

El servicio no consume backend. La fachada o página contenedora debe obtener la configuración,
validarla y entregarla al componente.

`b-spots.color-theme` conserva el branding global para `/login` y las rutas públicas. Al iniciar,
se eliminan automáticamente las claves históricas que incluían UUID.

## Accesibilidad

El editor incluye tabs con estado seleccionado, etiquetas para el selector nativo, valor actual
anunciable, controles de al menos 44 px y confirmación semántica antes de restablecer.
